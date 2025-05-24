import {
  commitTransaction,
  getSqlDate,
  rollbackTransaction,
  sqlQuery,
  startTransaction,
} from "../utils/database";
import { TradingPair } from "../utils/interfaces";
import {
  REFRESH_INTERVAL,
  REFRESH_PRICE_INTERVAL,
  SERVER_GROUP,
} from "../constants";
import { updateWebSocketSubscriptions } from "./websocket";
import { PoolConnection } from "mysql2/promise";
import { parseTokenPrice } from "../utils/functions";
import { SQL_TOKENS } from "../constants/tables";

let cachedPairs: TradingPair[] = [];
let priceMap = new Map();

/**
 * Function to start the periodic refresh of trading pairs
 */
export const startPairRefresh = () => {
  setInterval(async () => {
    await fetchAndCachePairs();
  }, REFRESH_INTERVAL);
};

/**
 * Function to start the periodic refresh of trading pairs
 */
export const updatePricesRefresh = () => {
  setInterval(async () => {
    try {
      console.log("UPDATING PRICES");
      console.log(priceMap);
      await updatePricesInDb();
    } catch (error) {
      console.log("Error updating prices on DB ", error);
    }
  }, REFRESH_PRICE_INTERVAL);
};

/**
 * Function to update the prices on DB
 */
const updatePricesInDb = async () => {
  let connection: PoolConnection | null = null;
  try {
    connection = await startTransaction();
    for (let [symbol, { price, timestamp }] of priceMap) {
      // Prepare the data array for the SQL query
      try {
        await connection?.execute(
          `
        UPDATE ${SQL_TOKENS}
        SET price = ?, timestamp = ?
        WHERE from_pair = ?`,
          [price, timestamp, symbol]
        );
      } catch (error) {
        console.error(`Error updating price for ${symbol}:`, error);
      }
    }

    // Commit transaction
    await commitTransaction(connection);
  } catch (error) {
    if (connection) await rollbackTransaction(connection);
    console.log("Error updating prices on DB! ", error);
  }
};

/**
 * Function to fetch trading pairs from the database and cache them
 */
export const fetchAndCachePairs = async (): Promise<void> => {
  try {
    console.log("REFRESHING CACHE PAIRS");
    const query = `
      SELECT from_pair, to_pair 
      FROM ${SQL_TOKENS} 
      WHERE is_active=1
      AND server_group=${SERVER_GROUP}`;
    const result = (await sqlQuery(query)) as TradingPair[];
    cachedPairs = result;

    // After updating the cache, refresh WebSocket subscriptions
    await updateWebSocketSubscriptions();
  } catch (error) {
    console.error("Error fetching trading pairs:", error);
    throw error;
  }
};

/**
 *  Function to get the cached trading pairs
 */
export const getCachedPairs = (): TradingPair[] => {
  return cachedPairs;
};

/**
 * Updates the price of a trading pair in the database based on incoming WebSocket data.
 * @param data The raw data received from the WebSocket.
 */
export const updatePrice = async (data: any) => {
  try {
    const messageObj = JSON.parse(data);

    // Validate that the message contains price information
    if (messageObj && typeof messageObj.PRICE === "number") {
      // Input price on DB
      const price = await parseTokenPrice(messageObj.PRICE);
      const priceTimestamp = await getSqlDate(messageObj.LASTUPDATE * 1000);

      // Update cached price
      const token = `${
        messageObj.FROMSYMBOL === "STARK" ? "STRK" : messageObj.FROMSYMBOL
      }`;
      priceMap.set(token, {
        price: price,
        timestamp: priceTimestamp,
      });

      console.log(
        `Price ${messageObj.FROMSYMBOL}/${messageObj.TOSYMBOL}: ${messageObj.PRICE} - ${price}`
      );
    } else {
      // Log a warning if the price data is missing
      console.warn(
        "Price data is missing in the received message:",
        messageObj
      );
    }
  } catch (error) {
    // Log any errors encountered during the process
    console.error("Error processing incoming data:", error);
  }
};
