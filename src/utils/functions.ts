import { ethers } from "ethers";
import { PRICE_DECIMALS } from "../constants";
import { sqlQuery } from "./database";
import { SQL_TOKENS_CATEGORY_LIST } from "../constants/tables";

/**
 * Transforms an input string to a format compatible with Coingecko ID
 * @param {string} input - The input string to transform
 * @returns {Promise<string>} - A promise that resolves to the transformed string
 */
export async function transformToCoingeckoId(input: string): Promise<string> {
  // Convert all characters to lowercase
  let lowerCaseString = input.toLowerCase();

  // Replace all spaces with hyphens
  return lowerCaseString.replace(/\s+/g, "-");
}

/**
 * Parses a token price, ensuring proper precision and format
 * @param {any} price_ - The price to parse
 * @returns {Promise<string>} - A promise that resolves to the parsed price as a string
 */
export async function parseTokenPrice(price_: any) {
  let originalPrice = price_.toString();
  let numericPrice = Number(originalPrice);

  // Fix for scientific notation and ensuring correct precision
  let adjustedPrice = numericPrice.toFixed(PRICE_DECIMALS);

  // Truncate the number to the required decimal places
  let parts = adjustedPrice.split(".");
  if (parts.length > 1 && parts[1].length > 18) {
    parts[1] = parts[1].substring(0, 18); // Truncate to 18 decimal places
  }
  adjustedPrice = parts.join(".");

  // Parse the adjusted price using ethers.js
  const price = ethers.utils
    .parseUnits(adjustedPrice, PRICE_DECIMALS)
    .toString();

  return price;
}

/**
 * Retrieves the list of token categories from the database and
 * maps category names to their IDs.
 *
 * @returns {Promise<{[key: string]: number}>} - A promise that resolves to an object mapping category names to their IDs.
 */
export async function loadTokenCategories() {
  try {
    // Query to select id and category_name from the tokens category list
    const result = await sqlQuery(
      `SELECT id, category_name FROM ${SQL_TOKENS_CATEGORY_LIST}`
    );

    // Populate the CATEGORY_MAP with category_name as key and id as value
    const CATEGORY_MAP: { [key: string]: number } = {};
    for (const r of result) {
      CATEGORY_MAP[r?.category_name] = r.id;
    }

    return CATEGORY_MAP;
  } catch (error) {
    console.log("Error on loadTokenCategories: ", error);
  }
}
