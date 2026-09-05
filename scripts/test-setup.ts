import "../tests/e2e/development-only";
import { config } from "dotenv";
import { Pool } from "pg";
import fs from "node:fs";
import crypto from "node:crypto";
config({ path: ".env.local", quiet: true });
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  if (!process.env.NEON_AUTH_BASE_URL?.includes("ep-solitary-block"))
    throw Error("QA must use development.");
  fs.mkdirSync(".qa", { recursive: true });
  if (fs.existsSync(".qa/accounts.json")) {
    await pool.end();
    console.log("Development test accounts already configured.");
    return;
  }
  const password = crypto.randomBytes(20).toString("base64url");
  const accounts = [];
  for (const role of ["admin", "student", "other"]) {
    const email = `qa-${role}-${Date.now()}@example.invalid`;
    const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email,
        password,
        name:
          role === "admin"
            ? "QA Administrator"
            : role === "student"
              ? "Alex Morgan"
              : "Taylor Reed",
      }),
    });
    const d = await res.json();
    if (!res.ok) {
      console.log({ status: res.status, error: d });
      throw Error("QA signup failed");
    }
    const id = d.user.id;
    await pool.query(
      'update neon_auth."user" set "emailVerified"=true where id=$1',
      [id],
    );
    await pool.query(
      "insert into profiles (id,email,name,role) values($1,$2,$3,$4)",
      [id, email, d.user.name, role === "admin" ? "admin" : "student"],
    );
    accounts.push({ id, email, password, role });
  }
  fs.writeFileSync(".qa/accounts.json", JSON.stringify(accounts), {
    mode: 0o600,
  });
  await pool.end();
  console.log(
    "Created three isolated development QA accounts; no verification messages sent.",
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
