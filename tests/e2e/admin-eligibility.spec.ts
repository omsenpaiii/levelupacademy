import "./development-only";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
const accounts = JSON.parse(fs.readFileSync(".qa/accounts.json", "utf8")) as {
  email: string;
  password: string;
  role: string;
}[];
// Run against a development server with ADMIN_EMAIL_ALLOWLIST set to the QA 'other' email.
test("approved verified student gains admin access; ordinary student remains restricted", async ({
  browser,
}) => {
  test.skip(!process.env.TEST_ADMIN_ELIGIBILITY, "Requires the isolated admin eligibility server on port 3001");
  test.setTimeout(120000);
  for (const role of ["other", "student"]) {
    const account = accounts.find((a) => a.role === role)!;
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("http://localhost:3001/auth/sign-in");
    await page.getByLabel("Email address", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(
      role === "other" ? /\/admin$/ : /\/students$/,
      { timeout: 45000 },
    );
    await page.goto("http://localhost:3001/admin");
    await expect(page).toHaveURL(role === "other" ? /\/admin$/ : /\/students$/);
    await context.close();
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:3001/auth/continue");
  await expect(page).toHaveURL(/\/auth\/sign-in$/);
  await context.close();
});
