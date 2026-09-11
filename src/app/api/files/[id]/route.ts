import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { resourceFilename } from "@/lib/resources";
import { apiUser } from "@/lib/session";
import { assertAccess } from "@/lib/data";
import { db } from "@/lib/db";
import { files, assessments, lessons } from "@/lib/schema";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const u = await apiUser();
    const f = await db.query.files.findFirst({
      where: eq(files.id, (await params).id),
    });
    if (!f || !f.size) throw Error("Not available");
    if (f.kind === "submission" && u.role !== "admin" && f.ownerId !== u.id)
      throw Error("Not available");
    if (f.courseId) await assertAccess(u.id, f.courseId);
    if (f.assessmentId && u.role !== "admin") {
      const a = await db.query.assessments.findFirst({
        where: eq(assessments.id, f.assessmentId),
      });
      if (!a?.published) throw Error("Not available");
    }
    if (f.lessonId && u.role !== "admin") {
      const lesson = await db.query.lessons.findFirst({
        where: eq(lessons.id, f.lessonId),
      });
      if (!lesson?.published || lesson.courseId !== f.courseId)
        throw Error("Not available");
    }
    const result = await get(f.pathname, { access: "private" });
    if (!result || result.statusCode !== 200) throw Error("Not available");
    return new Response(result.stream, {
      headers: {
        "Content-Type": f.contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(resourceFilename(f.title, f.contentType))}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "This file is not available to your account." },
      { status: 404 },
    );
  }
}
