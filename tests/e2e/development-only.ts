import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
if (
  !process.env.NEON_AUTH_BASE_URL?.includes("ep-solitary-block-a73acvc1") ||
  !process.env.DATABASE_URL_UNPOOLED?.includes("ep-solitary-block-a73acvc1")
)
  throw Error(
    "Integration tests require the isolated Level Up development branch.",
  );
