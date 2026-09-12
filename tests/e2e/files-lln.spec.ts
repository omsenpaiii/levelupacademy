import "./development-only";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { Pool } from "pg";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
const accounts = JSON.parse(fs.readFileSync(".qa/accounts.json", "utf8")) as {
  id: string;
  email: string;
  password: string;
  role: string;
}[];
async function signIn(page: Page, role: string) {
  const a = accounts.find((a) => a.role === role)!;
  await page.goto("http://localhost:3000/auth/sign-in");
  await page.getByLabel("Email address", { exact: true }).fill(a.email);
  await page.getByLabel("Password", { exact: true }).fill(a.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(role === "admin" ? /\/admin$/ : /\/students$/, { timeout: 30000 });
}
test("private upload, LLN builder and access revocation", async ({
  browser,
}) => {
  test.setTimeout(240000);
  if (!process.env.NEON_AUTH_BASE_URL?.includes("ep-solitary-block"))
    throw Error("Development database only");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  const {
    rows: [course],
  } = await pool.query(
    "select id from courses where slug='general-english-elicos'",
  );
  await pool.query(
    "delete from submissions where assessment_id in (select id from assessments where title in ('QA: File submission','QA: Readiness check'))",
  );
  await pool.query(
    "delete from files where assessment_id in (select id from assessments where title in ('QA: File submission','QA: Readiness check'))",
  );
  await pool.query(
    "delete from assessments where title in ('QA: File submission','QA: Readiness check')",
  );
  await pool.query(
    "insert into enrollments (id,user_id,course_id,status) values(gen_random_uuid()::text,$1,$2,'active') on conflict(user_id,course_id) do update set status='active'",
    [accounts.find((a) => a.role === "student")!.id, course.id],
  );
  const staff = await browser.newPage();
  await signIn(staff, "admin");
  await staff.goto(`http://localhost:3000/admin/courses/${course.id}`);
  const add = staff
    .locator("details")
    .filter({
      has: staff
        .locator("summary")
        .filter({ hasText: "Add an assessment or LLN activity" }),
    });
  await add.locator("summary").first().click();
  await add.getByLabel("Assessment title").fill("QA: File submission");
  await add
    .getByLabel("Student instructions")
    .fill("Upload your approved response for this development test.");
  await add.getByLabel("Publish approved assessment").check();
  await add
    .getByRole("button", { name: "Add assessment", exact: true })
    .click();
  await expect(add.getByRole("status")).toContainText("Changes saved", {
    timeout: 15000,
  });
  await staff.reload();
  const lln = staff
    .locator("details")
    .filter({
      has: staff
        .locator("summary")
        .filter({ hasText: "Add an assessment or LLN activity" }),
    });
  await lln.locator("summary").first().click();
  await lln.getByLabel("Assessment title").fill("QA: Readiness check");
  await lln.getByLabel("Activity type").selectOption("lln");
  await lln
    .getByLabel("Student instructions")
    .fill("Select the correct answer for this development test.");
  await lln.getByLabel("Publish approved assessment").check();
  await lln.getByText("LLN question builder").click();
  await lln.getByRole("button", { name: "Add question", exact: true }).click();
  await lln
    .getByLabel("Question text")
    .fill("How many days are there in one week?");
  await lln
    .getByLabel("Option 1 for question 1", { exact: true })
    .fill("Seven");
  await lln.getByLabel("Option 2 for question 1", { exact: true }).fill("Five");
  await lln
    .getByRole("button", { name: "Add assessment", exact: true })
    .click();
  await expect(lln.getByRole("status")).toContainText("Changes saved", {
    timeout: 15000,
  });
  const { rows: assessments } = await pool.query(
    "select id,title from assessments where course_id=$1 and title like 'QA:%'",
    [course.id],
  );
  const fileAssessment = assessments.find(
    (a) => a.title === "QA: File submission",
  );
  const quiz = assessments.find((a) => a.title === "QA: Readiness check");
  const student = await browser.newPage();
  await signIn(student, "student");
  await student.goto(
    `http://localhost:3000/students/assessments/${fileAssessment.id}`,
  );
  await student
    .getByLabel("Attach your assessment")
    .setInputFiles({
      name: "qa-response.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nDevelopment QA document.\n%%EOF"),
    });
  await expect(student.getByRole("status")).toContainText(
    "qa-response.pdf uploaded.",
    { timeout: 45000 },
  );
  await student.getByLabel("I confirm this submission is my own work").check();
  await student.getByRole("button", { name: "Submit assessment" }).click();
  await expect(
    student.getByText("Your work is with your trainer.", { exact: false }),
  ).toBeVisible({ timeout: 15000 });
  const download = await student
    .getByRole("link", { name: "Your submitted file" })
    .getAttribute("href");
  const own = await student.request.get("http://localhost:3000" + download);
  expect(own.status()).toBe(200);
  expect(own.headers()["content-type"]).toContain("application/pdf");
  const other = await browser.newPage();
  await signIn(other, "other");
  expect(
    (await other.request.get("http://localhost:3000" + download)).status(),
  ).toBe(404);
  expect(
    (
      await other.request.get("http://localhost:3000/api/admin/export")
    ).status(),
  ).toBe(403);
  await other.goto(`http://localhost:3000/students/assessments/${quiz.id}`);
  await expect(
    other.getByRole("heading", { name: "This page isn’t available." }),
  ).toBeVisible();
  await student.goto(`http://localhost:3000/students/assessments/${quiz.id}`);
  await student.getByLabel("Seven", { exact: true }).check();
  await student.getByLabel("I confirm this submission is my own work").check();
  await student.getByRole("button", { name: "Submit assessment" }).click();
  await expect(
    student.getByRole("heading", { name: "Score: 100%" }),
  ).toBeVisible({ timeout: 15000 });
  await student.screenshot({ path: "/tmp/levelup-lln.png", fullPage: true });
  await pool.query(
    "update enrollments set status='revoked' where user_id=$1 and course_id=$2",
    [accounts.find((a) => a.role === "student")!.id, course.id],
  );
  expect(
    (await student.request.get("http://localhost:3000" + download)).status(),
  ).toBe(404);
  await pool.query(
    "update enrollments set status='active' where user_id=$1 and course_id=$2",
    [accounts.find((a) => a.role === "student")!.id, course.id],
  );
  expect(
    (
      await staff.request.get(
        "http://localhost:3000/api/admin/export?type=students",
      )
    ).status(),
  ).toBe(200);
  await pool.end();
  await staff.close();
  await student.close();
  await other.close();
});
