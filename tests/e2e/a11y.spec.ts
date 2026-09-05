import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("accessible public pages at desktop and mobile sizes", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/students",
      "/students/catalogue",
      "/auth/sign-in",
      "/auth/sign-up",
    ]) {
      await page.goto("http://localhost:3000" + path);
      await page.getByRole("heading").first().waitFor();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        result.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      ).toEqual([]);
      if (path === "/students")
        await page.screenshot({
          path: `/tmp/levelup-${width}.png`,
          fullPage: true,
        });
    }
  }
});
