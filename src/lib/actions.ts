"use server";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "./db";
import * as s from "./schema";
import { apiUser } from "./session";
import { assertAccess } from "./data";
import { applicationSchema, scoreAnswers, videoEmbed } from "./validation";
export type ActionResult = { ok: boolean; message: string; id?: string };
const text = (v: unknown, max = 10000) => z.string().trim().max(max).parse(v);
export async function mutate(
  action: string,
  input: Record<string, unknown>,
): Promise<ActionResult> {
  try {
    const admin = action.startsWith("admin.");
    const u = await apiUser(admin);
    let id = typeof input.id === "string" ? input.id : "";
    if (action === "profile") {
      const v = z
        .object({
          name: z.string().trim().min(2).max(150),
          phone: z.string().trim().max(40),
          address: z.string().trim().max(500),
        })
        .parse(input);
      await db.update(s.profiles).set(v).where(eq(s.profiles.id, u.id));
    } else if (action === "apply") {
      const v = applicationSchema.parse(input);
      const c = await db.query.courses.findFirst({
        where: and(
          eq(s.courses.id, v.courseId),
          eq(s.courses.published, true),
          eq(s.courses.archived, false),
        ),
      });
      if (!c) throw Error("This course is not accepting applications.");
      await db
        .insert(s.applications)
        .values({
          userId: u.id,
          courseId: v.courseId,
          details: {
            goals: v.goals,
            experience: v.experience,
            preferredStart: v.preferredStart,
            support: v.support,
          },
        })
        .onConflictDoNothing();
    } else if (action === "progress") {
      const v = z
        .object({
          lessonId: z.string(),
          seconds: z.number().int().min(0).max(86400).default(0),
          completed: z.boolean(),
        })
        .parse(input);
      const lesson = await db.query.lessons.findFirst({
        where: and(eq(s.lessons.id, v.lessonId), eq(s.lessons.published, true)),
      });
      if (!lesson) throw Error("Lesson not available.");
      await assertAccess(u.id, lesson.courseId);
      await db
        .insert(s.progress)
        .values({ userId: u.id, ...v })
        .onConflictDoUpdate({
          target: [s.progress.userId, s.progress.lessonId],
          set: {
            seconds: sql`greatest(${s.progress.seconds},${v.seconds})`,
            completed: v.completed,
            updatedAt: new Date(),
          },
        });
    } else if (action === "submit") {
      const a = await db.query.assessments.findFirst({
        where: and(
          eq(s.assessments.id, String(input.assessmentId)),
          eq(s.assessments.published, true),
        ),
      });
      if (!a) throw Error("Assessment not available.");
      await assertAccess(u.id, a.courseId);
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${u.id + ":" + a.id}))`,
        );
        const previous = await tx.query.submissions.findFirst({
          where: and(
            eq(s.submissions.assessmentId, a.id),
            eq(s.submissions.userId, u.id),
          ),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        });
        if (previous && ["submitted", "satisfactory"].includes(previous.status))
          throw Error(
            previous.status === "submitted"
              ? "Your submission is awaiting review."
              : "This assessment is already satisfactory.",
          );
        if (a.kind === "lln") {
          const answers = z
            .record(z.string(), z.number().int())
            .parse(input.answers);
          const score = scoreAnswers(a.questions, answers);
          await tx.insert(s.submissions).values({
            assessmentId: a.id,
            userId: u.id,
            answers,
            score,
            status:
              score >= a.passPercent ? "satisfactory" : "not_satisfactory",
          });
        } else {
          const answer = text(input.answer || "");
          const fileId =
            typeof input.fileId === "string" && input.fileId
              ? input.fileId
              : null;
          if (!answer && !fileId)
            throw Error("Add a response or upload your assessment file.");
          if (fileId) {
            const f = await tx.query.files.findFirst({
              where: and(
                eq(s.files.id, fileId),
                eq(s.files.ownerId, u.id),
                eq(s.files.kind, "submission"),
                eq(s.files.assessmentId, a.id),
              ),
            });
            if (!f || f.size <= 0)
              throw Error("Choose a completed upload for this assessment.");
          }
          await tx
            .insert(s.submissions)
            .values({ assessmentId: a.id, userId: u.id, answer, fileId });
        }
      });
    } else if (action === "feedback") {
      const v = z
        .object({
          subject: z.string().trim().min(3).max(200),
          message: z.string().trim().min(10).max(5000),
        })
        .parse(input);
      await db.insert(s.feedback).values({ ...v, userId: u.id });
    } else if (action === "notifications") {
      await db
        .update(s.notifications)
        .set({ readAt: new Date() })
        .where(eq(s.notifications.userId, u.id));
    } else if (action === "admin.application") {
      const v = z
        .object({
          id: z.string(),
          status: z.enum(["approved", "declined", "pending"]),
          notes: z.string().max(4000).default(""),
        })
        .parse(input);
      await db.transaction(async (tx) => {
        const [a] = await tx
          .select()
          .from(s.applications)
          .where(eq(s.applications.id, v.id))
          .for("update");
        if (!a) throw Error("Application not found.");
        await tx
          .update(s.applications)
          .set({ status: v.status, notes: v.notes, updatedAt: new Date() })
          .where(eq(s.applications.id, v.id));
        if (v.status === "approved") {
          await tx
            .insert(s.enrollments)
            .values({ userId: a.userId, courseId: a.courseId })
            .onConflictDoUpdate({
              target: [s.enrollments.userId, s.enrollments.courseId],
              set: { status: "active" },
            });
        }
        await tx.insert(s.notifications).values({
          userId: a.userId,
          title: `Application ${v.status}`,
          body:
            v.notes ||
            "Your application has been reviewed by the admissions team.",
          href: "/students/my-courses",
        });
      });
    } else if (action === "admin.student") {
      const v = z
        .object({
          id: z.string(),
          name: z.string().min(2).max(150),
          phone: z.string().max(40),
          address: z.string().max(500),
          archived: z.boolean(),
        })
        .parse(input);
      if (v.id === u.id && v.archived)
        throw Error("You cannot archive your own account.");
      await db.update(s.profiles).set(v).where(eq(s.profiles.id, v.id));
    } else if (action === "admin.enrollment") {
      const v = z
        .object({
          userId: z.string(),
          courseId: z.string(),
          status: z.enum(["active", "revoked"]),
          completed: z.boolean().default(false),
          certificateStatus: z
            .enum(["not-issued", "pending", "issued"])
            .default("not-issued"),
          certificateNumber: z.string().max(150).default(""),
        })
        .parse(input);
      const person = await db.query.profiles.findFirst({
        where: and(eq(s.profiles.id, v.userId), eq(s.profiles.archived, false)),
      });
      if (!person) throw Error("Select an active student.");
      if (
        v.certificateStatus === "issued" &&
        (!v.completed || !v.certificateNumber)
      )
        throw Error(
          "Record course completion and a certificate number before marking it issued.",
        );
      const { completed, ...value } = v;
      await db
        .insert(s.enrollments)
        .values({ ...value, completedAt: completed ? new Date() : null })
        .onConflictDoUpdate({
          target: [s.enrollments.userId, s.enrollments.courseId],
          set: { ...value, completedAt: completed ? new Date() : null },
        });
    } else if (action === "admin.course") {
      const v = z
        .object({
          id: z.string().optional(),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          title: z.string().min(3).max(250),
          code: z.string().max(80),
          category: z.string().min(1).max(100),
          summary: z.string().min(10).max(500),
          description: z.string().min(10).max(30000),
          duration: z.string().max(150),
          delivery: z.string().max(150),
          requirements: z.string().max(15000),
          sourceUrl: z.string().url(),
          image: z.string().startsWith("/images/"),
          published: z.boolean(),
          archived: z.boolean(),
        })
        .parse(input);
      id = v.id || crypto.randomUUID();
      await db
        .insert(s.courses)
        .values({ ...v, id })
        .onConflictDoUpdate({
          target: s.courses.id,
          set: { ...v, updatedAt: new Date() },
        });
    } else if (action === "admin.module") {
      const v = z
        .object({
          courseId: z.string(),
          title: z.string().min(2).max(250),
          position: z.coerce.number().int().min(0),
        })
        .parse(input);
      await db.insert(s.modules).values(v);
    } else if (action === "admin.lesson") {
      const v = z
        .object({
          id: z.string().optional(),
          courseId: z.string(),
          moduleId: z.string().nullable(),
          title: z.string().min(2).max(250),
          body: z.string().max(30000),
          videoUrl: z.string().max(2000),
          position: z.coerce.number().int().min(0),
          published: z.boolean(),
        })
        .parse(input);
      if (v.videoUrl && !videoEmbed(v.videoUrl))
        throw Error(
          "Use a valid HTTPS YouTube, Vimeo or Google Drive video link.",
        );
      if (v.published && !v.body.trim() && !v.videoUrl)
        throw Error("Add lesson content before publishing.");
      if (v.moduleId) {
        const m = await db.query.modules.findFirst({
          where: and(
            eq(s.modules.id, v.moduleId),
            eq(s.modules.courseId, v.courseId),
          ),
        });
        if (!m) throw Error("Select a module from this course.");
      }
      id = v.id || crypto.randomUUID();
      await db
        .insert(s.lessons)
        .values({ ...v, id })
        .onConflictDoUpdate({ target: s.lessons.id, set: v });
    } else if (action === "admin.assessment") {
      const v = z
        .object({
          id: z.string().optional(),
          courseId: z.string(),
          title: z.string().min(3).max(250),
          instructions: z.string().min(10).max(30000),
          kind: z.enum(["assignment", "lln"]),
          passPercent: z.coerce.number().int().min(1).max(100),
          published: z.boolean(),
          questions: z
            .array(
              z.object({
                id: z.string().min(1),
                prompt: z.string().min(3),
                options: z.array(z.string().min(1)).min(2).max(6),
                correct: z.number().int().min(0),
              }),
            )
            .max(100),
          dueAt: z.string().nullable(),
        })
        .parse(input);
      if (v.kind === "lln" && v.published && !v.questions.length)
        throw Error("Add approved questions before publishing.");
      if (
        v.questions.some((q) => q.correct >= q.options.length) ||
        new Set(v.questions.map((q) => q.id)).size !== v.questions.length
      )
        throw Error("Check question IDs and correct answers.");
      id = v.id || crypto.randomUUID();
      const values = { ...v, id, dueAt: v.dueAt ? new Date(v.dueAt) : null };
      await db
        .insert(s.assessments)
        .values(values)
        .onConflictDoUpdate({ target: s.assessments.id, set: values });
    } else if (action === "admin.review") {
      const v = z
        .object({
          id: z.string(),
          status: z.enum(["satisfactory", "not_satisfactory"]),
          feedback: z.string().trim().min(3).max(5000),
        })
        .parse(input);
      const sub = await db.query.submissions.findFirst({
        where: eq(s.submissions.id, v.id),
      });
      if (!sub) throw Error("Submission not found.");
      await db.transaction(async (tx) => {
        await tx
          .update(s.submissions)
          .set({ ...v, reviewedBy: u.id, reviewedAt: new Date() })
          .where(eq(s.submissions.id, v.id));
        await tx.insert(s.notifications).values({
          userId: sub.userId,
          title: "Assessment feedback is ready",
          body: v.feedback,
          href: `/students/assessments/${sub.assessmentId}`,
        });
      });
    } else if (action === "admin.feedback") {
      await db
        .update(s.feedback)
        .set({ status: z.enum(["open", "resolved"]).parse(input.status) })
        .where(eq(s.feedback.id, id));
    } else throw Error("Action not found.");
    if (admin)
      await db.insert(s.audit).values({
        actorId: u.id,
        action,
        entityId: id || String(input.courseId || input.userId || ""),
      });
    // TODO(phase-2): Add Stripe checkout and verified webhook fulfilment as a separate enrolment source. Manual approval remains available.
    revalidatePath("/students", "layout");
    revalidatePath("/admin", "layout");
    return {
      ok: true,
      message:
        action === "apply"
          ? "Application received. Admissions will review it and update your portal."
          : action === "submit"
            ? "Your assessment has been submitted."
            : "Changes saved.",
      id,
    };
  } catch (e) {
    if (e instanceof z.ZodError)
      return {
        ok: false,
        message: e.issues[0]?.message || "Check the form fields.",
      };
    const msg = e instanceof Error ? e.message : "";
    if (
      /Failed query|password|postgres|relation|constraint|duplicate key/i.test(
        msg,
      )
    ) {
      console.error("Portal mutation failed:", action);
      return {
        ok: false,
        message:
          "We couldn’t save those changes. Check for duplicate records and try again.",
      };
    }
    return {
      ok: false,
      message: msg || "Something went wrong. Please try again.",
    };
  }
}
