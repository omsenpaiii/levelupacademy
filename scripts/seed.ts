import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { courses } from "../src/lib/schema";
import source from "../docs/wix-catalogue-source.json";
config({ path: process.env.ENV_FILE || ".env.local", quiet: true });
const summaries = [
  "Speak, write and connect with confidence. Develop everyday English skills in a supportive Melbourne classroom.",
  "Build the academic English and test-taking skills you need for your next step in study.",
  "Build practical skills to support people in aged care and disability settings, with classroom learning and work placement.",
  "Help people with disability achieve greater independence, participation and wellbeing.",
  "Learn essential first aid and CPR skills through practical, in-person training.",
  "Prepare to work safely in construction with essential workplace health and safety training.",
  "Practise safe manual handling techniques for work in aged care and the health sector.",
  "Develop the skills to contribute to projects, support teams and coordinate day-to-day project work.",
  "Build your capability in managing project scope, time, cost, stakeholders and risk.",
  "Develop trade skills in solid plastering for residential and commercial construction.",
  "Learn to apply membranes and protective coatings in residential and commercial construction.",
  "Develop practical wall and floor tiling skills for residential and commercial projects.",
  "Develop skills in construction planning, contracts, estimating and project management.",
];
const durations = [
  "10 weeks per level",
  "20 weeks",
  "52 weeks",
  "52 weeks",
  "1 day",
  "1 day",
  "1 day",
  "Confirm with admissions",
  "52 weeks",
  "52 weeks",
  "52 weeks",
  "52 weeks",
  "Confirm with admissions",
];
async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  const db = drizzle(pool);
  for (const [i, d] of source.entries()) {
    const text = d.text;
    const start = text.indexOf("Qualification Description:");
    const end = text.indexOf("Qualification Requirements", start);
    const description =
      start >= 0
        ? text.slice(start + 1, end > start ? end : start + 5).join("\n\n")
        : summaries[i];
    const requirementStart = text.indexOf("Entry Requirements:");
    const reqEnd = text.indexOf("Condition of Entry:", requirementStart);
    const requirements =
      requirementStart >= 0
        ? text
            .slice(
              requirementStart + 1,
              reqEnd > requirementStart ? reqEnd : requirementStart + 5,
            )
            .join("\n")
        : i === 1
          ? text[3]
          : "Please contact admissions to confirm entry requirements and your study pathway.";
    const title = text[0].replace("lll", "III").replace("lV", "IV");
    const code =
      text
        .slice(0, 4)
        .join(" ")
        .match(/\b(?:CHC|BSB|CPC|HLT)[A-Z]*\d{3,6}\b/)?.[0] ||
      (i < 2 ? (i === 0 ? "CRICOS 095630F" : "CRICOS 096496K") : "");
    await db
      .insert(courses)
      .values({
        slug: d.slug,
        title,
        code,
        category:
          i < 2
            ? "English language"
            : i < 4
              ? "Community services"
              : i < 7
                ? "Short courses"
                : i < 9
                  ? "Project management"
                  : "Building & construction",
        summary: summaries[i],
        description,
        duration: durations[i],
        delivery:
          i === 2 || i === 3
            ? "Classroom + work placement"
            : i >= 9
              ? "Campus + workshop"
              : "On campus",
        image: "/images/" + d.slug + ".png",
        sourceUrl: d.url,
        requirements,
        published: true,
      })
      .onConflictDoNothing({ target: courses.slug });
  }
  await pool.end();
  console.log(
    "13 catalogue courses imported. Existing staff edits preserved. No teaching materials or students seeded.",
  );
}
main().catch(() => {
  console.error("Catalogue import failed.");
  process.exit(1);
});
