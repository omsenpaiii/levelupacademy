import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { pool?: Pool };
const pool =
  globalDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
if (process.env.NODE_ENV !== "production") globalDb.pool = pool;
attachDatabasePool(pool);
export const db = drizzle(pool, { schema });
