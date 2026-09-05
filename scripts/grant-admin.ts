import { config } from "dotenv";
import { Pool } from "pg";
config({ path: process.env.ENV_FILE || ".env.local", quiet: true });
async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) throw Error("Usage: npm run admin:grant -- verified-email");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  try {
    const { rows } = await pool.query(
      'select id, name, email from neon_auth."user" where lower(email)=$1 and "emailVerified"=true',
      [email],
    );
    if (rows.length !== 1) throw Error("One verified account is required.");
    await pool.query(
      "insert into profiles (id,email,name,role) values($1,$2,$3,'admin') on conflict(id) do update set role='admin'",
      [rows[0].id, rows[0].email, rows[0].name],
    );
    console.log("Administrator role granted.");
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
