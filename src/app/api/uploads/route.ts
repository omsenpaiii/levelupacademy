import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { z } from "zod";
import { apiUser } from "@/lib/session";
import { assertAccess } from "@/lib/data";
import { db } from "@/lib/db";
import { files, assessments, lessons } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { uploadTypes, maxUpload } from "@/lib/validation";
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, payload) => {
        const u = await apiUser();
        const v = z
          .object({
            courseId: z.string(),
            assessmentId: z.string().optional(),
            lessonId: z.string().optional(),
            kind: z.enum(["resource", "submission"]),
          })
          .parse(JSON.parse(payload || "{}"));
        if (v.kind === "resource" && u.role !== "admin")
          throw Error("Staff access required.");
        await assertAccess(u.id, v.courseId);
        if (v.lessonId) {
          const lesson = await db.query.lessons.findFirst({
            where: and(
              eq(lessons.id, v.lessonId),
              eq(lessons.courseId, v.courseId),
            ),
          });
          if (!lesson || v.kind !== "resource")
            throw Error("Select a lesson from this course.");
        }
        if (v.kind === "submission" && !v.assessmentId)
          throw Error("Select an assessment.");
        if (v.assessmentId) {
          const a = await db.query.assessments.findFirst({
            where: and(
              eq(assessments.id, v.assessmentId),
              eq(assessments.courseId, v.courseId),
            ),
          });
          if (!a || (!a.published && u.role !== "admin"))
            throw Error("Assessment not available.");
        }
        if (
          !/^(resource|submission)\/[0-9a-f-]{36}\/[\w .()-]+$/i.test(
            pathname,
          ) ||
          pathname.length > 300
        )
          throw Error(
            "Use a simple filename containing letters, numbers, spaces or hyphens.",
          );
        await db.insert(files).values({
          ownerId: u.id,
          ...v,
          pathname,
          title: pathname.split("/").pop()!,
          contentType: "pending",
          size: 0,
        });
        return {
          allowedContentTypes: Object.keys(uploadTypes),
          maximumSizeInBytes: maxUpload,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ ownerId: u.id, pathname }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        error:
          "Upload could not be authorised. Check your enrolment, filename and file type.",
      },
      { status: 400 },
    );
  }
}
