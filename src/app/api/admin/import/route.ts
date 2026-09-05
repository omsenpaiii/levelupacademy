import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { apiUser } from "@/lib/session";
import { db } from "@/lib/db";
import { profiles, courses, enrollments, audit } from "@/lib/schema";
export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== req.nextUrl.origin)
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const u = await apiUser(true);
    const fd = await req.formData();
    const file = fd.get("file");
    if (
      !(file instanceof File) ||
      !file.name.endsWith(".xlsx") ||
      file.size > 5 * 1024 * 1024
    )
      throw Error("Upload an Excel .xlsx workbook under 5 MB.");
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await file.arrayBuffer());
    const sheet = book.worksheets[0];
    if (!sheet || sheet.rowCount > 501 || sheet.rowCount < 2)
      throw Error("Include 1–500 rows with a header.");
    const header = sheet.getRow(1);
    if (
      ["email", "courseSlug", "status"].some(
        (name, i) => String(header.getCell(i + 1).value) !== name,
      )
    )
      throw Error("Use the template columns: email, courseSlug, status.");
    const [people, catalogue] = await Promise.all([
      db.select().from(profiles).where(eq(profiles.archived, false)),
      db.select().from(courses).where(eq(courses.archived, false)),
    ]);
    const seen = new Set<string>();
    const rows: {
      email: string;
      courseSlug: string;
      status: string;
      error?: string;
      userId?: string;
      courseId?: string;
    }[] = [];
    for (let i = 2; i <= sheet.rowCount; i++) {
      const row = sheet.getRow(i);
      const email = String(row.getCell(1).value || "")
        .trim()
        .toLowerCase();
      const courseSlug = String(row.getCell(2).value || "").trim();
      const status = String(row.getCell(3).value || "").trim();
      const person = people.find((p) => p.email.toLowerCase() === email);
      const c = catalogue.find((c) => c.slug === courseSlug);
      const key = email + ":" + courseSlug;
      const error = !person
        ? "Student must register first."
        : !c
          ? "Course not found."
          : !["active", "revoked"].includes(status)
            ? "Status must be active or revoked."
            : seen.has(key)
              ? "Duplicate row."
              : undefined;
      seen.add(key);
      rows.push({
        email,
        courseSlug,
        status,
        error,
        userId: person?.id,
        courseId: c?.id,
      });
    }
    const valid = rows.every((r) => !r.error);
    if (fd.get("commit") === "true") {
      if (!valid) throw Error("Correct the workbook before importing.");
      await db.transaction(async (tx) => {
        for (const r of rows)
          await tx
            .insert(enrollments)
            .values({
              userId: r.userId!,
              courseId: r.courseId!,
              status: r.status,
            })
            .onConflictDoUpdate({
              target: [enrollments.userId, enrollments.courseId],
              set: { status: r.status },
            });
        await tx.insert(audit).values({
          actorId: u.id,
          action: "admin.import-enrollments",
          entityId: `${rows.length} rows`,
        });
      });
    }
    return NextResponse.json({
      rows: rows.map(({ email, courseSlug, status, error }) => ({
        email,
        courseSlug,
        status,
        error,
      })),
      valid,
      message:
        fd.get("commit") === "true"
          ? `${rows.length} enrolments imported.`
          : undefined,
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    return NextResponse.json(
      {
        error: /Upload|Include|template|Correct|sign in|Staff|Verify/.test(m)
          ? m
          : "Import failed. Check the workbook and try again.",
      },
      { status: 400 },
    );
  }
}
