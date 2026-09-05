import "./development-only";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import ExcelJS from "exceljs";
const accounts = JSON.parse(fs.readFileSync(".qa/accounts.json", "utf8")) as {
  email: string;
  password: string;
  role: string;
}[];
test("staff Excel preview and commit; mobile profile and support", async ({
  page,
}) => {
  test.setTimeout(120000);
  const a = accounts.find((a) => a.role === "admin")!;
  await page.goto("http://localhost:3000/auth/sign-in");
  await page.getByLabel("Email address", { exact: true }).fill(a.email);
  await page.getByLabel("Password", { exact: true }).fill(a.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/students$/, { timeout: 30000 });
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Enrolments");
  sheet.addRow(["email", "courseSlug", "status"]);
  sheet.addRow([
    accounts.find((a) => a.role === "other")!.email,
    "diploma-of-project-management",
    "active",
  ]);
  const bytes = await book.xlsx.writeBuffer();
  await page.goto("http://localhost:3000/admin/import");
  await page
    .getByLabel("Excel workbook")
    .setInputFiles({
      name: "qa-import.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from(bytes),
    });
  await page.getByRole("button", { name: "Preview import" }).click();
  await expect(page.getByRole("status")).toContainText("Ready to import.", {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Import 1 enrolments" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 enrolments imported.",
    { timeout: 15000 },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/students/profile");
  await page.getByLabel("Phone number").fill("+61 400 000 000");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved", {
    timeout: 15000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "/tmp/levelup-mobile-profile.png",
    fullPage: true,
  });
});
