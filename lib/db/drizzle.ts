import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set. Please check your .env file.');
}

let client: postgres.Sql;

try {
  // Attempt to connect to the database
  client = postgres(process.env.POSTGRES_URL, {
    // Adding a connection timeout to fail faster if the DB is not available
    connect_timeout: 10 // seconds
  });
  console.log("Successfully connected to PostgreSQL.");
} catch (error) {
  console.error("🔴 Failed to create PostgreSQL client.");
  console.error("Please ensure your database server is running and the POSTGRES_URL is correct in your .env file.");
  if (error instanceof Error) {
    console.error("Error details:", error.message);
  }
  // Exit gracefully if the database connection cannot be established.
  // This prevents the application from running in a broken state.
  process.exit(1);
}

export { client };
export const db = drizzle(client, { schema });

// Optional: Add a health check function to verify the connection
async function checkDbConnection() {
  try {
    await client`SELECT 1`;
    console.log("Database connection verified successfully.");
  } catch (error) {
    console.error("🔴 Database connection verification failed.");
    console.error("Please check your database credentials and ensure the server is accessible.");
    if (error instanceof Error) {
        console.error("Error details:", error.message);
    }
    process.exit(1);
  }
}

// Run the check when the module is loaded
checkDbConnection();