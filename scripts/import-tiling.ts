import { config, parse } from "dotenv";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { head, put } from "@vercel/blob";
import * as s from "../src/lib/schema";
import manifest from "../docs/tiling-resources.json";
const arg = (name: string) => process.argv[process.argv.indexOf(name) + 1];
const target = process.argv.includes("--production")
  ? "production"
  : "development";
config({ path: process.env.ENV_FILE || ".env.local", quiet: true });
const digest = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const moduleId = (code: string) => `tiling:${code}:module`;
const lessonId = (code: string) => `tiling:${code}:lesson`;
const assessmentId = (code: string) => `tiling:${code}:assessment`;
async function main() {
  if (!process.argv.includes("--source"))
    throw Error("Provide --source with the supplied course folder.");
  const root = resolve(arg("--source"));
  const expectedHost =
    target === "production"
      ? "ep-sparkling-field-a7hp14mr"
      : "ep-solitary-block-a73acvc1";
  if (!process.env.DATABASE_URL_UNPOOLED?.includes(expectedHost))
    throw Error("Database does not match the explicitly selected target.");
  // Verify every supplied byte before uploading or publishing any database records.
  for (const f of manifest.files) {
    const bytes = readFileSync(resolve(root, f.path));
    if (bytes.length !== f.size || digest(bytes) !== f.sha256)
      throw Error(`Source file differs from reviewed manifest: ${f.path}`);
  }
  const token =
    process.env.BLOB_READ_WRITE_TOKEN ||
    (existsSync(".env.local")
      ? parse(readFileSync(".env.local")).BLOB_READ_WRITE_TOKEN
      : undefined);
  if (!token) throw Error("Private Blob credentials are required.");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL_UNPOOLED,
  });
  const db = drizzle(pool, { schema: s });
  try {
    const course = await db.query.courses.findFirst({
      where: eq(s.courses.slug, manifest.courseSlug),
    });
    if (!course) throw Error("Tiling catalogue course is missing.");
    const owner = await db.query.profiles.findFirst({
      where: and(
        eq(s.profiles.role, "admin"),
        eq(s.profiles.archived, false),
        process.argv.includes("--owner-email")
          ? eq(s.profiles.email, arg("--owner-email"))
          : undefined,
      ),
    });
    if (!owner) throw Error("An active staff owner is required.");
    const existingFiles = await db
      .select()
      .from(s.files)
      .where(eq(s.files.courseId, course.id));
    for (const f of manifest.files) {
      const existing = existingFiles.find(
        (row) => row.id === `tiling:file:${digest(f.path).slice(0, 24)}`,
      );
      if (
        existing &&
        (!existing.pathname.includes(f.sha256) || existing.size !== f.size)
      )
        throw Error(
          `An imported file has changed; review and version it explicitly before replacing: ${f.path}`,
        );
    }
    const importedFiles: (typeof s.files.$inferInsert)[] = [];
    let completed = 0,
      next = 0;
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (next < manifest.files.length) {
          const f = manifest.files[next++];
          const filename = f.path.split("/").pop()!;
          const contentType = filename.endsWith(".pptx")
            ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            : "application/pdf";
          const pathname = `course-imports/${target}/cpc31320/${f.sha256}/${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
          let stored = false;
          try {
            const blob = await head(pathname, { token });
            stored = blob.size === f.size;
          } catch {
            /* A new source file needs an upload. */
          }
          if (!stored)
            await put(pathname, readFileSync(resolve(root, f.path)), {
              token,
              access: "private",
              contentType,
              addRandomSuffix: false,
              allowOverwrite: false,
            });
          importedFiles.push({
            id: `tiling:file:${digest(f.path).slice(0, 24)}`,
            ownerId: owner.id,
            courseId: course.id,
            lessonId: f.unitCode ? lessonId(f.unitCode) : null,
            assessmentId:
              f.kind === "assessment" && f.unitCode
                ? assessmentId(f.unitCode)
                : null,
            title: `${f.unitCode ? f.unitCode + " · " : ""}${f.title}`,
            pathname,
            contentType,
            size: f.size,
            kind: "resource",
          });
          completed++;
          if (completed % 10 === 0 || completed === manifest.files.length)
            console.log(
              `Private files ready: ${completed}/${manifest.files.length}`,
            );
        }
      }),
    );
    await db.transaction(async (tx) => {
      for (const unit of manifest.units) {
        await tx
          .insert(s.modules)
          .values({
            id: moduleId(unit.code),
            courseId: course.id,
            title: unit.code,
            position: unit.position,
          })
          .onConflictDoNothing();
        await tx
          .insert(s.lessons)
          .values({
            id: lessonId(unit.code),
            courseId: course.id,
            moduleId: moduleId(unit.code),
            title: unit.title,
            position: unit.position,
            published: true,
            body: `${unit.code} — ${unit.title}\n\nUse the supplied learner guide and class presentation to study this unit. Complete the class activities and follow the self-study guide alongside your scheduled training.\n\nWhen your trainer advises you to begin assessment, open the student assessment pack below. Your trainer will confirm practical assessment arrangements and submission requirements. Marking this resource page complete records your study progress; it does not award competency.`,
          })
          .onConflictDoNothing();
        await tx
          .insert(s.assessments)
          .values({
            id: assessmentId(unit.code),
            courseId: course.id,
            title: `${unit.code} — ${unit.title}`,
            kind: "assignment",
            published: true,
            instructions: `Download the supplied ${unit.code} student assessment pack. Read its assessment conditions, declarations and task instructions before starting.\n\nComplete the required student sections and upload your completed pack here for trainer review. Keep trainer/assessor sections for your trainer. Practical demonstrations and observations must be arranged with your trainer; uploading a file does not complete those requirements.\n\nFollow your trainer’s advised due date and evidence requirements. If additional evidence or a different submission arrangement is needed, contact your trainer through student services.`,
          })
          .onConflictDoNothing();
      }
      // Stable IDs make reruns safe; existing staff edits and learner progress remain intact.
      for (const f of importedFiles)
        await tx.insert(s.files).values(f).onConflictDoNothing();
      await tx.insert(s.audit).values({
        actorId: owner.id,
        action: "admin.import-tiling-resources",
        entityId: `${course.id}:17 units,88 files`,
      });
    });
    const all = await db
      .select()
      .from(s.files)
      .where(eq(s.files.courseId, course.id));
    const storedIds = new Set(all.map((f) => f.id));
    if (importedFiles.some((f) => !storedIds.has(f.id!)))
      throw Error("Post-import verification failed.");
    console.log(
      `${target}: 17 units, 17 trainer-reviewed assessments and 88 private files imported. Existing records preserved.`,
    );
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(
    e instanceof Error
      ? e.message.replace(
          /postgres(?:ql)?:\/\/[^\s]+/g,
          "[redacted database URL]",
        )
      : "Import failed",
  );
  process.exit(1);
});
