import dotenv from "dotenv";

dotenv.config();

export const PRICE_DECIMALS = 18; // Price decimals
export const RECONNECT_INTERVAL = 5000; // Reconnect websocket if gets disconnected
export const REFRESH_INTERVAL = 600000; // Refresh interval of cached trading pairs
export const REFRESH_PRICE_INTERVAL = 1000; // Interval to refresh prices

export const SERVER_GROUP = process.env.SEVER_GROUP; // Defines a group of trading pairs to listen
export const API_KEY = process.env.CRYPTOCOMPARE_API_KEY || ""; // Cryptocompare api key
export const WEBSOCKET_URL = process.env.CRYPTOCOMPARE_SOCKET + API_KEY; // Cryptocompare socket url

// SCRAPER
export const COINGECKO_API = "https://api.coingecko.com/api";
export const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "";
export const CRYTOCOMPARE_API = "https://min-api.cryptocompare.com";

// QUEUES
export const SOCKET_QUEUE = "socket_queue";
