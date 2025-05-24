import axios from "axios";
import {
  API_KEY,
  COINGECKO_API,
  COINGECKO_API_KEY,
  CRYTOCOMPARE_API,
  PRICE_DECIMALS,
} from "../constants";
import { getSqlDate, sqlBatchQuery, sqlQuery } from "../utils/database";
import {
  SQL_TOKENS,
  SQL_TOKENS_CATEGORIES,
  SQL_TOKENS_CATEGORY_LIST,
  SQL_TOKENS_OVERVIEW,
} from "../constants/tables";
import { ethers } from "ethers";
import {
  loadTokenCategories,
  parseTokenPrice,
  transformToCoingeckoId,
} from "../utils/functions";
import { response } from "express";

/**
 * Fetches categories from the CoinGecko API and updates the database.
 * This function makes an API call to CoinGecko to retrieve cryptocurrency categories,
 * extracts the relevant data, and inserts or updates it in the database.
 */
export async function getCategories() {
  try {
    // Make coingecko api call
    const response = await axios.request({
      method: "GET",
      url: `${COINGECKO_API}/v3/coins/categories`,
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      },
    });

    // Extract categories
    let CATEGORIES: any[] = [];
    for (const r of response.data) {
      CATEGORIES.push([r.id, r.name, r.market_cap || null, r.content]);
    }

    // Insert or update the categories in the database
    await sqlBatchQuery(
      `
        INSERT IGNORE INTO ${SQL_TOKENS_CATEGORY_LIST} (
            category_id,
            category_name,
            market_cap,
            description
        ) VALUES ?
        ON DUPLICATE KEY UPDATE 
            category_name = VALUES(category_name),
            market_cap = VALUES(market_cap),
            description = VALUES(description)
    `,
      CATEGORIES
    );

    console.log("Categories updated successfully!");
  } catch (error) {
    console.log("Error on getCategories: ", error);
  }
}

/**
 * Retrieves the top market cap tokens from the CoinGecko API and stores them in the database.
 *
 * @param {number} [page=0] - The page number for pagination, default is 0.
 * @returns {Promise<void>} - A promise that resolves when the operation is complete.
 */
export async function getTopMCTokens(page = 0) {
  try {
    // Make coingecko api call
    const response = await axios.request({
      method: "GET",
      url: `${COINGECKO_API}/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      },
    });

    // Extract categories
    let TOKENS: any[] = [];
    for (const r of response.data) {
      TOKENS.push([
        r.symbol.toUpperCase() + "USD",
        r.symbol.toUpperCase(),
        "USD",
        r.name,
        r.image,
        r.id,
        r.market_cap || null,
        r.market_cap_rank,
      ]);
    }

    // Insert token data into the database
    await sqlBatchQuery(
      `INSERT IGNORE INTO ${SQL_TOKENS} 
        (symbol, from_pair, to_pair, name, image, coingecko_id, market_cap, market_cap_rank) VALUES ?
        ON DUPLICATE KEY UPDATE 
            market_cap = VALUES(market_cap),
            market_cap_rank = VALUES(market_cap_rank)
        `,
      TOKENS
    );

    console.log("Scraped tokens by MC for page ", page);
  } catch (error) {
    console.log("Error on getTopMCTokens: ", error);
  }
}

/**
 * Marks tokens with active price feeds by fetching data
 * from the CryptoCompare API
 *
 * @returns {Promise<void>} - A promise that resolves when the operation is complete
 */
export async function markTokensWithPriceFeed() {
  try {
    // Fetch list of tokens from the database
    const tokens = await sqlQuery(`SELECT * FROM ${SQL_TOKENS}`);

    // Fetch token data from the CryptoCompare API
    const response = await axios.get(
      `${CRYTOCOMPARE_API}/data/all/coinlist?api_key=${API_KEY}`
    );
    const feedTokens = response.data.Data;

    // Iterate through tokens and check if they are supported by CryptoCompare
    const ACTIVATE: string[] = [];
    for (const token of tokens) {
      const symbol = token.from_pair;
      if (symbol in feedTokens && feedTokens[symbol].IsTrading == true)
        ACTIVATE.push(token.id);
      else console.log("Discarded...", symbol);
    }

    // Update the tokens to active in the database
    if (ACTIVATE.length < 1) return;
    const activateList = ACTIVATE.join(",");
    await sqlQuery(
      `UPDATE ${SQL_TOKENS} SET is_active=1 WHERE id IN (${activateList})`
    );
    console.log(`TOKENS SUCCESSFULLY TAGGED!`);
  } catch (error) {
    console.log("Error on markTokensWithPriceFeed: ", error);
  }
}

/**
 * Retrieves tokens with null descriptions from the database
 * and completes their information using the CoinGecko API.
 */
export async function addInfoOfTokens() {
  try {
    // Query to select tokens with null descriptions and are active
    const tokens = await sqlQuery(
      `SELECT * FROM ${SQL_TOKENS} 
      WHERE description IS NULL`
    );

    // Update information for each token
    const categories = await loadTokenCategories();
    for (const token of tokens)
      await addTokenInfo(token.id, token.coingecko_id, categories);
  } catch (error) {
    console.log("Error on addInfoOfTokens: ", error);
  }
}

/**
 * Updates the information of a specific token using data from the CoinGecko API.
 * Specifically updates current price, description and token categories.
 *
 * @param {string} id - The ID of the token.
 * @param {string} token - The CoinGecko ID of the token.
 * @param {any} CATEGORY_MAP - The mapping of category names to their IDs.
 */
export async function addTokenInfo(
  id: string,
  token: string,
  CATEGORY_MAP: any
) {
  try {
    // Make CoinGecko API call to get token information
    const response = await axios.request({
      method: "GET",
      url: `${COINGECKO_API}/v3/coins/${token}`,
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      },
    });

    // Update token information in the database
    await sqlQuery(
      `UPDATE ${SQL_TOKENS} SET description=?, price=?, timestamp=? WHERE id=?`,
      [
        response.data?.description?.en,
        await parseTokenPrice(response.data?.market_data.current_price.usd),
        await getSqlDate(),
        id,
      ]
    );

    // Insert token categories into the database
    const CATEGORIES: any[] = [];
    for (const category of response.data?.categories)
      CATEGORIES.push([id, CATEGORY_MAP[category]]);
    await sqlBatchQuery(
      `INSERT IGNORE INTO ${SQL_TOKENS_CATEGORIES} (token, category) VALUES ?`,
      CATEGORIES
    );

    console.log("Added info for... ", token);
  } catch (error) {
    console.log("Error on addTokenInfo: ", error);
  }
}

/**
 * Removes tokens from the database based on the provided IDs.
 *
 * @param {number[]} ids - An array of token IDs to remove
 * @returns {Promise<void>} - A promise that resolves when the tokens have been removed
 */
export async function removeTokens(ids: number[]) {
  try {
    // Loop through each ID to remove associated tokens
    for (const id of ids) {
      const r = await sqlQuery(`SELECT symbol FROM ${SQL_TOKENS} WHERE id=?`, [
        id,
      ]);
      await sqlQuery(`DELETE FROM ${SQL_TOKENS_OVERVIEW} WHERE symbol=?`, [
        r[0].symbol,
      ]);
      await sqlQuery(`DELETE FROM ${SQL_TOKENS_CATEGORIES} WHERE token=?`, [
        id,
      ]);
      await sqlQuery(`DELETE FROM ${SQL_TOKENS} WHERE id=?`, [id]);
      console.log(`Token ${id} removed successfully!`);
    }
  } catch (error) {
    console.log("Error on removeToken: ", error);
  }
}

/**
 * Adds a new token to the database by fetching its information from the CoinGecko API.
 * The token data is then inserted into the database, ensuring no duplicates are inserted.
 * If the token already exists, certain fields are updated with the latest data.
 *
 * @param {string} token - The ID of the token to be added.
 * @param {number} server_group - The server group associated with the token.
 */
export async function addToken(token: string, server_group: number) {
  try {
    // Make CoinGecko API call to get token information
    const response = await axios.request({
      method: "GET",
      url: `${COINGECKO_API}/v3/coins/${token}`,
      headers: {
        accept: "application/json",
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      },
    });

    let r = response.data;

    // Insert token on DB
    let TOKENS: any[] = [];
    TOKENS.push([
      r.symbol.toUpperCase() + "USD",
      r.symbol.toUpperCase(),
      "USD",
      r.name,
      r.image.large,
      r.id,
      r.market_cap || null,
      r.market_cap_rank,
      r.description?.en,
      await parseTokenPrice(r?.market_data.current_price.usd),
      await getSqlDate(),
      server_group,
      1,
    ]);

    // Insert token data into the database
    await sqlBatchQuery(
      `INSERT IGNORE INTO ${SQL_TOKENS} 
        (symbol, from_pair, to_pair, name, image, coingecko_id, market_cap, market_cap_rank, description, price, timestamp, server_group, is_active) VALUES ?
        ON DUPLICATE KEY UPDATE 
            market_cap = VALUES(market_cap),
            market_cap_rank = VALUES(market_cap_rank)
      `,
      TOKENS
    );

    console.log(`Token ${token} added successfully!`);
  } catch (error) {
    console.log("Error on addToken: ", error);
  }
}
