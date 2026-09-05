import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
config({ path: process.env.ENV_FILE || ".env.local", quiet: true });
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("Migrations applied.");
}
main().catch(() => {
  console.error(
    "Migration failed. Check database connectivity and migration history.",
  );
  process.exit(1);
});
