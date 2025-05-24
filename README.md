# Crypto Price Fetcher

A robust real-time cryptocurrency price fetcher that connects to CryptoCompare's WebSocket API for live price updates and uses CoinGecko for token metadata enrichment. Built for applications requiring accurate and timely cryptocurrency market data.

![Crypto Price Fetcher](https://img.shields.io/badge/Crypto-Price%20Fetcher-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![License](https://img.shields.io/badge/License-ISC-yellow)

## 📖 Overview

This cryptocurrency price fetcher provides real-time price data by connecting directly to CryptoCompare's WebSocket streams, with additional token metadata sourced from CoinGecko. It's designed as a reliable infrastructure component for applications that need up-to-date cryptocurrency market information with persistent storage capabilities.

### Key Features

- **Real-time Price Updates**: Utilizes WebSocket connections to CryptoCompare for instant price updates
- **Metadata Enrichment**: Uses CoinGecko API to fetch token descriptions, categories, and other metadata
- **Persistent Storage**: Stores historical and current price data in a MySQL database
- **Configurable Tokens**: Easily add or remove tokens to track based on your needs
- **Server Grouping**: Organize tokens into server groups for efficient management
- **Automatic Recovery**: Built-in reconnection logic for handling API disruptions

## 🏗️ Architecture

The application follows a modular architecture with several key components:

1. **Data Scrapers**: Services that fetch token information from external APIs
2. **WebSocket Client**: Maintains connections to price feed providers for real-time updates
3. **Database Layer**: Manages data persistence and retrieval operations
4. **Trading Pair Manager**: Handles the caching and refreshing of trading pairs
5. **Price Processor**: Processes incoming price data and updates the database

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐
│  CryptoCompare  │     │    CoinGecko    │
│      API        │     │      API        │
│ (Price Data)    │     │   (Metadata)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌────────────────┐     ┌─────────────────┐
│   WebSocket    │     │  Data Scraper   │
│    Client      │     │                 │
└────────┬───────┘     └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
          ┌───────────────────┐
          │  Price Processor  │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │  MySQL Database   │
          └─────────┬─────────┘
                    │
                    ▼
          ┌───────────────────┐
          │    Blockchain     │
          │   Applications    │
          └───────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- API keys for CoinGecko and CryptoCompare

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/crypto-price-fetcher.git
   cd crypto-price-fetcher
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   # Database Configuration
   SQL_HOST=localhost
   SQL_USER=your_mysql_username
   SQL_PASSWORD=your_mysql_password
   SQL_DB_NAME=price_feeds
   SQL_PORT=3306

   # API Keys
   CRYPTOCOMPARE_API_KEY=your_cryptocompare_api_key
   COINGECKO_API_KEY=your_coingecko_api_key

   # WebSocket URL
   CRYPTOCOMPARE_SOCKET=wss://streamer.cryptocompare.com/v2?api_key=

   # Server Configuration
   SERVER_GROUP=1
   ```

4. Set up the database:
   - Create a MySQL database named `price_feeds`
   - Create the following tables:
     - `tokens`: Stores token information
     - `tokens_category_list`: Stores token categories
     - `tokens_categories`: Maps tokens to categories
     - `tokens_overview`: Stores token overview data

### Database Schema

Here's a simplified version of the required database schema:

```sql
CREATE TABLE tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL UNIQUE,
  from_pair VARCHAR(20) NOT NULL,
  to_pair VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  image VARCHAR(255),
  coingecko_id VARCHAR(100),
  market_cap BIGINT,
  market_cap_rank INT,
  description TEXT,
  price VARCHAR(78),
  timestamp DATETIME,
  server_group INT DEFAULT 1,
  is_active TINYINT DEFAULT 0
);

CREATE TABLE tokens_category_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id VARCHAR(100) NOT NULL UNIQUE,
  category_name VARCHAR(100) NOT NULL,
  market_cap BIGINT,
  description TEXT
);

CREATE TABLE tokens_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token INT,
  category INT,
  UNIQUE KEY token_category (token, category),
  FOREIGN KEY (token) REFERENCES tokens(id) ON DELETE CASCADE,
  FOREIGN KEY (category) REFERENCES tokens_category_list(id) ON DELETE CASCADE
);

CREATE TABLE tokens_overview (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  data JSON,
  timestamp DATETIME,
  FOREIGN KEY (symbol) REFERENCES tokens(symbol) ON DELETE CASCADE
);
```

## 📁 Project Structure

```
src/
├── config/
│   └── database.ts          # Database configuration
├── constants/
│   ├── index.ts             # Application constants
│   └── tables.ts            # Database table names
├── services/
│   ├── scraper.ts           # Token data scraping from APIs
│   ├── tradingPairs.ts      # Trading pair management and caching
│   └── websocket.ts         # WebSocket connection management
├── utils/
│   ├── database.ts          # Database utility functions
│   ├── functions.ts         # General utility functions
│   ├── interfaces.ts        # TypeScript interfaces
│   └── logger.ts            # Logging utilities
└── index.ts                 # Application entry point
```

## 🔧 Usage

### Running the Application

Start the application in development mode:

```bash
npm run dev
```

For production:

```bash
npm run build
npm start
```

**Note**: The application entry point is `src/index.ts`. You may need to modify the main function in this file to enable/disable specific features like token addition, removal, or price fetching based on your needs.

### Configuration

The application uses environment variables for configuration. Make sure to set up your `.env` file with the required variables:

- `CRYPTOCOMPARE_API_KEY`: Your CryptoCompare API key for accessing their services
- `COINGECKO_API_KEY`: Your CoinGecko API key for token metadata
- `CRYPTOCOMPARE_SOCKET`: WebSocket URL for real-time price feeds
- `SERVER_GROUP`: Server group identifier for organizing tokens
- Database connection settings (`SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`, `SQL_PORT`)

### Adding Tokens

To add a new token to track:

```typescript
// In src/index.ts
await addToken("bitcoin", 1); // token_id, server_group
```

### Removing Tokens

To remove tokens from tracking:

```typescript
// In src/index.ts
await removeTokens([123, 456]); // Array of token IDs
```

### Updating Token Information

To update information for tokens with missing data:

```typescript
// In src/index.ts
await addInfoOfTokens();
```

## 🔌 API Documentation

The application doesn't expose a REST API by default, but you can easily extend it to provide one using the Express framework that's already included as a dependency.

Example of adding a simple API endpoint:

```typescript
import express from "express";
import { sqlQuery } from "./utils/database";
import { SQL_TOKENS } from "./constants/tables";

const app = express();
const PORT = process.env.PORT || 3000;

// Get all active tokens
app.get("/api/tokens", async (req, res) => {
  try {
    const tokens = await sqlQuery(
      `SELECT * FROM ${SQL_TOKENS} WHERE is_active=1`
    );
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tokens" });
  }
});

// Get price for a specific token
app.get("/api/price/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const token = await sqlQuery(
      `SELECT symbol, from_pair, to_pair, price, timestamp FROM ${SQL_TOKENS} WHERE from_pair=?`,
      [symbol.toUpperCase()]
    );
    if (token.length === 0) {
      return res.status(404).json({ error: "Token not found" });
    }
    res.json(token[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch price" });
  }
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
```

## 🚢 Deployment

For production environments, consider using a process manager like PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start dist/index.js --name crypto-price-fetcher

# Or use the development mode with PM2
pm2 start "npm run dev" --name crypto-price-fetcher-dev
```

This ensures the application stays running and restarts automatically if it crashes.

## 🔧 Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**

   - Verify your CryptoCompare API key is valid and has WebSocket access
   - Check if the WebSocket URL is correct in your `.env` file
   - Ensure your network allows WebSocket connections

2. **Database Connection Issues**

   - Verify MySQL is running and accessible
   - Check database credentials in your `.env` file
   - Ensure the database and tables exist

3. **No Price Updates**
   - Check if tokens are properly added to the database with `is_active=1`
   - Verify WebSocket subscriptions are being sent
   - Check the application logs for any error messages

### Logs

The application uses a custom logger. Check the console output for detailed information about:

- WebSocket connection status
- Database operations
- API calls and responses
- Error messages and stack traces

## ⚠️ Limitations and Considerations

- **API Rate Limits**: Both CoinGecko (for metadata) and CryptoCompare (for price data) have API rate limits. Monitor your usage and implement rate limiting if needed.
- **Data Accuracy**: Price data may vary slightly between different sources. The application primarily relies on CryptoCompare for price feeds.
- **Database Scaling**: For high-volume applications, consider implementing database indexing, connection pooling, or using a more scalable database solution.
- **Error Handling**: The application includes basic error handling with automatic reconnection for WebSocket connections.
- **Security**: Ensure your database and API keys are properly secured in production environments. Use environment variables and never commit sensitive data to version control.

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
