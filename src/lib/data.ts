import "server-only";
import { and, eq, desc, asc, inArray } from "drizzle-orm";
import { db } from "./db";
import * as s from "./schema";
export async function catalogue() {
  return db
    .select()
    .from(s.courses)
    .where(and(eq(s.courses.published, true), eq(s.courses.archived, false)))
    .orderBy(asc(s.courses.title));
}
export async function courseBySlug(slug: string) {
  return db.query.courses.findFirst({
    where: and(
      eq(s.courses.slug, slug),
      eq(s.courses.published, true),
      eq(s.courses.archived, false),
    ),
  });
}
export async function activeEnrollment(userId: string, courseId: string) {
  return db.query.enrollments.findFirst({
    where: and(
      eq(s.enrollments.userId, userId),
      eq(s.enrollments.courseId, courseId),
      eq(s.enrollments.status, "active"),
    ),
  });
}
export async function assertAccess(userId: string, courseId: string) {
  const [p, c, e] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(s.profiles.id, userId) }),
    db.query.courses.findFirst({ where: eq(s.courses.id, courseId) }),
    activeEnrollment(userId, courseId),
  ]);
  if (
    !p ||
    p.archived ||
    !c ||
    (p.role !== "admin" && (!e || !c.published || c.archived))
  )
    throw Error("You do not have access to this course.");
}
export async function studentData(userId: string) {
  const [enrolled, applications, progress, notifications] = await Promise.all([
    db
      .select({ enrollment: s.enrollments, course: s.courses })
      .from(s.enrollments)
      .innerJoin(s.courses, eq(s.enrollments.courseId, s.courses.id))
      .where(
        and(eq(s.enrollments.userId, userId), eq(s.courses.archived, false)),
      ),
    db
      .select({ application: s.applications, course: s.courses })
      .from(s.applications)
      .innerJoin(s.courses, eq(s.applications.courseId, s.courses.id))
      .where(eq(s.applications.userId, userId)),
    db.select().from(s.progress).where(eq(s.progress.userId, userId)),
    db
      .select()
      .from(s.notifications)
      .where(eq(s.notifications.userId, userId))
      .orderBy(desc(s.notifications.createdAt))
      .limit(40),
  ]);
  const ids = enrolled
    .filter((e) => e.enrollment.status === "active" && e.course.published)
    .map((e) => e.course.id);
  const lessons = ids.length
    ? await db
        .select()
        .from(s.lessons)
        .where(
          and(inArray(s.lessons.courseId, ids), eq(s.lessons.published, true)),
        )
    : [];
  return { enrolled, applications, progress, notifications, lessons };
}
export async function studentAssessments(userId: string) {
  const en = await db
    .select({ id: s.enrollments.courseId })
    .from(s.enrollments)
    .innerJoin(s.courses, eq(s.courses.id, s.enrollments.courseId))
    .where(
      and(
        eq(s.enrollments.userId, userId),
        eq(s.enrollments.status, "active"),
        eq(s.courses.published, true),
        eq(s.courses.archived, false),
      ),
    );
  if (!en.length) return [];
  return db
    .select({ assessment: s.assessments, course: s.courses })
    .from(s.assessments)
    .innerJoin(s.courses, eq(s.assessments.courseId, s.courses.id))
    .where(
      and(
        inArray(
          s.assessments.courseId,
          en.map((e) => e.id),
        ),
        eq(s.assessments.published, true),
      ),
    )
    .orderBy(asc(s.assessments.dueAt));
}
export async function attempts(userId: string, assessmentId?: string) {
  return db
    .select()
    .from(s.submissions)
    .where(
      and(
        eq(s.submissions.userId, userId),
        assessmentId ? eq(s.submissions.assessmentId, assessmentId) : undefined,
      ),
    )
    .orderBy(desc(s.submissions.createdAt));
}
