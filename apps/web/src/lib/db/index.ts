import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/product_base_dev';
const client = postgres(connectionString);
export const db = drizzle(client, { schema });
