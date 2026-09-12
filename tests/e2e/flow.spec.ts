import "./development-only";
import { test, expect } from "@playwright/test";
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
const student = accounts.find((a) => a.role === "student")!;
const admin = accounts.find((a) => a.role === "admin")!;
async function signIn(
  page: import("@playwright/test").Page,
  account: typeof student,
) {
  await page.goto("http://localhost:3000/auth/sign-in");
  await page.getByLabel("Email address", { exact: true }).fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(account.role === "admin" ? /\/admin$/ : /\/students$/, { timeout: 30000 });
}
test("complete student and staff learning workflow", async ({ browser }) => {
  test.setTimeout(180000);
  const cleanup = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  await cleanup.query("delete from applications where user_id=$1", [
    student.id,
  ]);
  await cleanup.query("delete from progress where user_id=$1", [student.id]);
  await cleanup.query(
    "delete from submissions where assessment_id in (select id from assessments where title='QA: Reflection')",
  );
  await cleanup.query("delete from assessments where title='QA: Reflection'");
  await cleanup.query(
    "delete from lessons where title='QA: Learning with confidence'",
  );
  await cleanup.query("delete from enrollments where user_id=$1", [student.id]);
  await cleanup.end();
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, student);
  await page.goto(
    "http://localhost:3000/students/catalogue/general-english-elicos",
  );
  await page
    .getByLabel("What would you like to achieve?")
    .fill("I would like to improve my English for professional study.");
  await page.getByLabel("I confirm these details").check();
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(page.getByRole("status")).toContainText("Application received", {
    timeout: 15000,
  });
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  await signIn(staff, admin);
  await staff.goto("http://localhost:3000/admin/applications");
  await staff.locator("summary").filter({ hasText: "Alex Morgan" }).click();
  await staff.getByLabel("Decision").selectOption("approved");
  await staff
    .getByLabel("Message to the student")
    .fill("Welcome to your development test course.");
  await staff.getByRole("button", { name: "Save decision" }).click();
  await expect(staff.getByRole("status")).toContainText("Changes saved", {
    timeout: 15000,
  });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  const {
    rows: [course],
  } = await pool.query(
    "select id from courses where slug='general-english-elicos'",
  );
  await staff.goto(`http://localhost:3000/admin/courses/${course.id}`);
  await staff.locator("summary").filter({ hasText: "Add a lesson" }).click();
  await staff.getByLabel("Lesson title").fill("QA: Learning with confidence");
  await staff
    .getByLabel("Lesson content")
    .fill(
      "Development test content. Read the introduction and mark this lesson complete.",
    );
  await staff.getByLabel("Publish this lesson").check();
  await staff.getByRole("button", { name: "Add lesson", exact: true }).click();
  await expect(staff.getByRole("status")).toContainText("Changes saved", {
    timeout: 15000,
  });
  await staff.reload();
  await staff
    .locator("summary")
    .filter({ hasText: "Add an assessment or LLN" })
    .click();
  const addAssessment = staff.locator("details").filter({
    has: staff
      .locator("summary")
      .filter({ hasText: "Add an assessment or LLN activity" }),
  });
  await addAssessment.getByLabel("Assessment title").fill("QA: Reflection");
  await addAssessment
    .getByLabel("Student instructions")
    .fill(
      "Describe one goal for your next learning session. This is a development test.",
    );
  await addAssessment.getByLabel("Publish approved assessment").check();
  await addAssessment
    .getByRole("button", { name: "Add assessment", exact: true })
    .click();
  await expect(addAssessment.getByRole("status")).toContainText(
    "Changes saved",
    {
      timeout: 15000,
    },
  );
  await page.goto(
    "http://localhost:3000/students/learn/general-english-elicos",
  );
  await expect(
    page.getByRole("heading", { name: "QA: Learning with confidence" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark lesson complete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mark as incomplete" }),
  ).toBeVisible();
  await page.goto("http://localhost:3000/students/assessments");
  await page.getByRole("link").filter({ hasText: "QA: Reflection" }).click();
  await page
    .getByLabel("Your response")
    .fill("My goal is to practise communicating confidently in English.");
  await page.getByLabel("I confirm this submission is my own work").check();
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(
    page.getByText("Your work is with your trainer.", { exact: false }),
  ).toBeVisible({ timeout: 15000 });
  await staff.goto("http://localhost:3000/admin/assessments");
  await staff.locator("summary").filter({ hasText: "QA: Reflection" }).click();
  const review = staff
    .locator("details")
    .filter({
      has: staff.locator("summary").filter({ hasText: "QA: Reflection" }),
    });
  await review
    .getByLabel("Assessment outcome")
    .selectOption("not_satisfactory");
  await review
    .getByLabel("Feedback for the student")
    .fill("Please add a specific practice activity.");
  await review.getByRole("button", { name: "Save review" }).click();
  await expect(review.getByRole("status")).toContainText("Changes saved", {
    timeout: 15000,
  });
  await page.reload();
  await expect(
    page.getByText("Please add a specific practice activity."),
  ).toBeVisible();
  await page
    .getByLabel("Your response")
    .fill(
      "I will practise speaking for ten minutes with a classmate each day.",
    );
  await page.getByLabel("I confirm this submission is my own work").check();
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(
    page.getByText("Your work is with your trainer.", { exact: false }),
  ).toBeVisible({ timeout: 15000 });
  await staff.goto("http://localhost:3000/admin");
  await staff.screenshot({ path: "/tmp/levelup-admin.png", fullPage: true });
  await page.goto("http://localhost:3000/students");
  await page.screenshot({ path: "/tmp/levelup-student.png", fullPage: true });
  await pool.end();
  await context.close();
  await staffContext.close();
});
test("responsive catalogue and access boundaries", async ({ page }) => {
  await page.goto("http://localhost:3000/students/catalogue");
  await page
    .getByRole("button", { name: "English language", exact: true })
    .click();
  await expect(page.getByText("2 courses to explore")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search course catalogue" })
    .fill("not-a-course");
  await expect(page.getByText("Let’s try another search.")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/students");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(
    page.getByRole("navigation", { name: "Student navigation" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Student resources", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little help, all in one place." }),
  ).toBeVisible();
  await page.goto("http://localhost:3000/admin");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  const r = await page.request.get("http://localhost:3000/api/admin/export");
  expect(r.status()).toBe(403);
  const file = await page.request.get(
    "http://localhost:3000/api/files/missing",
  );
  expect(file.status()).toBe(404);
});
