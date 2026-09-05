import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { eq } from "drizzle-orm";
import { apiUser } from "@/lib/session";
import { db } from "@/lib/db";
import * as s from "@/lib/schema";
export async function GET(req: NextRequest) {
  try {
    await apiUser(true);
    const type = req.nextUrl.searchParams.get("type") || "students";
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet("Records");
    let rows: Record<string, unknown>[] = [];
    if (type === "template") {
      sheet.columns = [
        { header: "email", key: "email", width: 32 },
        { header: "courseSlug", key: "courseSlug", width: 50 },
        { header: "status", key: "status", width: 20 },
      ];
    } else {
      if (type === "students")
        rows = await db
          .select({
            name: s.profiles.name,
            email: s.profiles.email,
            phone: s.profiles.phone,
            address: s.profiles.address,
            archived: s.profiles.archived,
          })
          .from(s.profiles);
      else if (type === "enrollments")
        rows = await db
          .select({
            email: s.profiles.email,
            courseSlug: s.courses.slug,
            status: s.enrollments.status,
            completedAt: s.enrollments.completedAt,
            certificateStatus: s.enrollments.certificateStatus,
            certificateNumber: s.enrollments.certificateNumber,
          })
          .from(s.enrollments)
          .innerJoin(s.profiles, eq(s.profiles.id, s.enrollments.userId))
          .innerJoin(s.courses, eq(s.courses.id, s.enrollments.courseId));
      else if (type === "applications")
        rows = await db
          .select({
            email: s.profiles.email,
            course: s.courses.title,
            status: s.applications.status,
            details: s.applications.details,
            notes: s.applications.notes,
            createdAt: s.applications.createdAt,
          })
          .from(s.applications)
          .innerJoin(s.profiles, eq(s.profiles.id, s.applications.userId))
          .innerJoin(s.courses, eq(s.courses.id, s.applications.courseId));
      else if (type === "submissions")
        rows = await db
          .select({
            email: s.profiles.email,
            assessment: s.assessments.title,
            status: s.submissions.status,
            score: s.submissions.score,
            feedback: s.submissions.feedback,
            createdAt: s.submissions.createdAt,
          })
          .from(s.submissions)
          .innerJoin(s.profiles, eq(s.profiles.id, s.submissions.userId))
          .innerJoin(
            s.assessments,
            eq(s.assessments.id, s.submissions.assessmentId),
          );
      else
        return NextResponse.json({ error: "Unknown export." }, { status: 400 });
      const keys = rows.length
        ? Object.keys(rows[0])
        : type === "students"
          ? ["name", "email", "phone", "address", "archived"]
          : ["email", "status"];
      sheet.columns = keys.map((key) => ({ header: key, key, width: 28 }));
      rows.forEach((row) =>
        sheet.addRow(
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [
              k,
              v instanceof Date
                ? v.toISOString()
                : v && typeof v === "object"
                  ? JSON.stringify(v)
                  : v,
            ]),
          ),
        ),
      );
    }
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF180F24" },
    };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await book.xlsx.writeBuffer();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="levelup-${type}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Verified staff access is required." },
      { status: 403 },
    );
  }
}
