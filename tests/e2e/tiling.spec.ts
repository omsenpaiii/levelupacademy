import "./development-only";
import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import fs from "node:fs";
import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import manifest from "../../docs/tiling-resources.json";
const accounts = JSON.parse(fs.readFileSync(".qa/accounts.json", "utf8")) as {
  id: string;
  email: string;
  password: string;
  role: string;
}[];
test("tiling unit resources, original downloads and enrolment boundaries", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  const {
    rows: [course],
  } = await pool.query("select id from courses where slug=$1", [
    manifest.courseSlug,
  ]);
  const { rows: files } = await pool.query(
    "select * from files where course_id=$1 and id like 'tiling:file:%'",
    [course.id],
  );
  if (!files.length) {
    await pool.end();
    test.skip(
      true,
      "Import the supplied tiling bundle into development before this test.",
    );
    return;
  }
  expect(files).toHaveLength(88);
  const student = accounts.find((a) => a.role === "student")!;
  const {
    rows: [oldEnrollment],
  } = await pool.query(
    "select status from enrollments where user_id=$1 and course_id=$2",
    [student.id, course.id],
  );
  await pool.query(
    "insert into enrollments(id,user_id,course_id,status) values(gen_random_uuid()::text,$1,$2,'active') on conflict(user_id,course_id) do update set status='active'",
    [student.id, course.id],
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  try {
    await page.goto("http://localhost:3000/auth/sign-in");
    await page.getByLabel("Email address", { exact: true }).fill(student.email);
    await page.getByLabel("Password", { exact: true }).fill(student.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/students$/, { timeout: 30000 });
    const route = "http://localhost:3000/students/learn/" + manifest.courseSlug;
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Unit resources", exact: true }),
    ).toBeVisible();
    expect(await page.locator(".unit-resource-card").count()).toBe(5);
    await expect(
      page.getByRole("link", { name: "Open assessment", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /CPCCWF3009 · Learner guide/ }),
    ).toHaveCount(0);
    for (const ext of [".pdf", ".pptx"]) {
      const source = manifest.files.find(
        (f) =>
          f.unitCode === "CPCCWHS2001" &&
          f.kind === (ext === ".pdf" ? "learner-guide" : "presentation"),
      )!;
      const file = files.find((f) => f.pathname.includes(source.sha256));
      const r = await page.request.get(
        "http://localhost:3000/api/files/" + file.id,
      );
      expect(r.status()).toBe(200);
      expect(
        createHash("sha256")
          .update(await r.body())
          .digest("hex"),
      ).toBe(source.sha256);
    }
    await page.goto(route + "?lesson=tiling:CPCCOM2001:lesson");
    expect(await page.locator(".unit-resource-card").count()).toBe(7);
    await expect(
      page.getByRole("link", { name: /Technical drawings and plans/ }),
    ).toBeVisible();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        axe.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: `/tmp/tiling-${width}.png`,
        fullPage: true,
      });
    }
    const file = files.find(
      (f) => f.lesson_id === "tiling:CPCCOM2001:lesson" && !f.assessment_id,
    );
    const anonymous = await browser.newContext();
    expect(
      (
        await anonymous.request.get(
          "http://localhost:3000/api/files/" + file.id,
        )
      ).status(),
    ).toBe(404);
    await anonymous.close();
    await pool.query(
      "update lessons set published=false where id='tiling:CPCCOM2001:lesson'",
    );
    try {
      expect(
        (
          await page.request.get("http://localhost:3000/api/files/" + file.id)
        ).status(),
      ).toBe(404);
    } finally {
      await pool.query(
        "update lessons set published=true where id='tiling:CPCCOM2001:lesson'",
      );
    }
    await pool.query(
      "update enrollments set status='revoked' where user_id=$1 and course_id=$2",
      [student.id, course.id],
    );
    expect(
      (
        await page.request.get("http://localhost:3000/api/files/" + file.id)
      ).status(),
    ).toBe(404);
  } finally {
    if (oldEnrollment)
      await pool.query(
        "update enrollments set status=$1 where user_id=$2 and course_id=$3",
        [oldEnrollment.status, student.id, course.id],
      );
    else
      await pool.query(
        "delete from enrollments where user_id=$1 and course_id=$2",
        [student.id, course.id],
      );
    await context.close();
    await pool.end();
  }
});
