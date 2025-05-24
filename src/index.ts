import {
  addInfoOfTokens,
  addToken,
  getTopMCTokens,
  markTokensWithPriceFeed,
  removeTokens,
} from "./services/scraper";
import {
  fetchAndCachePairs,
  startPairRefresh,
  updatePricesRefresh,
} from "./services/tradingPairs";
import { initWebSocket } from "./services/websocket";
import { logger } from "./utils/logger";

// Main function to start the application
const startApp = async () => {
  await addInfoOfTokens();
  // await removeTokens([560]);
  // await addToken("xai", 6);
  // await addInfoOfTokens();
  return;
  // Fetch and cache trading pairs at startup
  await fetchAndCachePairs();

  // Periodic refresh of cached pairs
  startPairRefresh();
  updatePricesRefresh();

  // Initialize WebSocket Connection
  initWebSocket();
  logger.log("Market Price Fetcher running...!");
  return;
};

startApp();
