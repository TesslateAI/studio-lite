import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import 'dotenv/config';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set.');
}

// This prevents us from creating new connections on every hot-reload in development.
// In production, this pattern is not used.
declare global {
  // eslint-disable-next-line no-var
  var client: postgres.Sql | undefined;
}

let client: postgres.Sql;

if (process.env.NODE_ENV === 'production') {
  client = postgres(process.env.POSTGRES_URL);
} else {
  if (!global.client) {
    global.client = postgres(process.env.POSTGRES_URL);
  }
  client = global.client;
}

export const db = drizzle(client, { schema });