import { Pool, PoolConnection } from "mysql2/promise";
import { connectDatabase } from "../config/database"; // Adjust the path as necessary

const pool: Pool = connectDatabase();

/**
 * Function: util function to raise a query on sql
 * @param query
 * @param values
 */
export const sqlQuery = async (query: string, values?: any[]): Promise<any> => {
  try {
    const [results] = await pool.execute(query, values);
    return results;
  } catch (error) {
    console.error("Database query error:", error);
    throw error; // Rethrow the error for the caller to handle
  }
};

/**
 * Executes an SQL btach query against a database using a connection pool.
 *
 * @param {string} query - The SQL query string to be executed. It can contain placeholders for parameterized queries.
 * @param {any[]} [values] - An optional array of values to be used with parameterized queries. Each value in this array corresponds to a placeholder in the query string.
 * @returns {Promise<any>} - A promise that resolves with the results of the query. The structure of the results depends on the database driver being used but typically includes rows returned by the query.
 * @throws {Error} - Throws an error if the query execution fails, containing information about the failure.
 */
export async function sqlBatchQuery(
  query: string,
  values?: any[]
): Promise<any> {
  try {
    const [results] = await pool.query(query, [values]);
    return results;
  } catch (error) {
    console.error("Database query error:", error);
    throw error; // Rethrow the error for the caller to handle
  }
}

/**
 * Initiates a new database transaction.
 *
 * This function retrieves a connection from the pool and starts a new transaction on that connection.
 * It ensures that multiple operations can be executed as a single transactional unit, providing atomicity.
 *
 * @returns {Promise<PoolConnection>} A promise that resolves with the database connection with an open transaction.
 */
export async function startTransaction(): Promise<PoolConnection> {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  return connection;
}

/**
 * Commits the current transaction.
 *
 * This function commits all operations performed within the transaction, making them permanent in the database.
 * It then releases the connection back to the pool, making it available for other operations.
 *
 * @param {PoolConnection} connection - The database connection with an open transaction to commit.
 */
export async function commitTransaction(connection: PoolConnection) {
  try {
    await connection.commit();
  } catch (error) {
    console.error("Failed to commit transaction:", error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Rolls back the current transaction.
 *
 * This function undoes all operations performed within the transaction, maintaining database integrity.
 * It is typically used in error handling to revert changes when an operation within the transaction fails.
 * The connection is then released back to the pool.
 *
 * @param {PoolConnection} connection - The database connection with an open transaction to roll back.
 */
export async function rollbackTransaction(connection: PoolConnection) {
  try {
    await connection.rollback();
  } catch (error) {
    console.error("Failed to rollback transaction:", error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Function: retuns current data as sql timestamp
 * @returns sql timestamp
 */
export const getSqlDate = async (date?: any) => {
  if (date) return new Date(date).toISOString().slice(0, 19).replace("T", " ");
  return new Date().toISOString().slice(0, 19).replace("T", " ");
};
