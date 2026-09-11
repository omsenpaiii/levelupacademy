import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const created = (name = "created_at") =>
  timestamp(name, { withTimezone: true }).defaultNow().notNull();
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").default(""),
  address: text("address").default(""),
  role: text("role").notNull().default("student"),
  archived: boolean("archived").notNull().default(false),
  createdAt: created(),
});
export const courses = pgTable("courses", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  code: text("code").default(""),
  category: text("category").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),
  duration: text("duration").default(""),
  delivery: text("delivery").default(""),
  image: text("image").notNull(),
  sourceUrl: text("source_url").notNull(),
  requirements: text("requirements").default(""),
  units: jsonb("units").$type<{ code: string; title: string }[]>().default([]),
  published: boolean("published").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  createdAt: created(),
  updatedAt: created("updated_at"),
});
export const modules = pgTable("modules", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  title: text("title").notNull(),
  position: integer("position").notNull().default(0),
});
export const lessons = pgTable("lessons", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  moduleId: text("module_id").references(() => modules.id),
  title: text("title").notNull(),
  body: text("body").default(""),
  videoUrl: text("video_url").default(""),
  position: integer("position").notNull().default(0),
  published: boolean("published").notNull().default(false),
});
export const applications = pgTable(
  "applications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    status: text("status").notNull().default("pending"),
    details: jsonb("details")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    notes: text("notes").default(""),
    createdAt: created(),
    updatedAt: created("updated_at"),
  },
  (t) => [uniqueIndex("application_user_course").on(t.userId, t.courseId)],
);
export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id),
    status: text("status").notNull().default("active"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    certificateStatus: text("certificate_status")
      .notNull()
      .default("not-issued"),
    certificateNumber: text("certificate_number").default(""),
    createdAt: created(),
  },
  (t) => [uniqueIndex("enrollment_user_course").on(t.userId, t.courseId)],
);
export const progress = pgTable(
  "progress",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    lessonId: text("lesson_id")
      .notNull()
      .references(() => lessons.id),
    seconds: integer("seconds").notNull().default(0),
    completed: boolean("completed").notNull().default(false),
    createdAt: created(),
    updatedAt: created("updated_at"),
  },
  (t) => [uniqueIndex("progress_user_lesson").on(t.userId, t.lessonId)],
);
export type Question = {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
};
export const assessments = pgTable("assessments", {
  id: id(),
  courseId: text("course_id")
    .notNull()
    .references(() => courses.id),
  title: text("title").notNull(),
  instructions: text("instructions").notNull(),
  kind: text("kind").notNull().default("assignment"),
  questions: jsonb("questions").$type<Question[]>().notNull().default([]),
  passPercent: integer("pass_percent").notNull().default(60),
  dueAt: timestamp("due_at", { withTimezone: true }),
  published: boolean("published").notNull().default(false),
  createdAt: created(),
});
export const files = pgTable("files", {
  id: id(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => profiles.id),
  courseId: text("course_id").references(() => courses.id),
  assessmentId: text("assessment_id").references(() => assessments.id),
  lessonId: text("lesson_id").references(() => lessons.id),
  title: text("title").notNull(),
  pathname: text("pathname").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  kind: text("kind").notNull(),
  createdAt: created(),
});
export const submissions = pgTable("submissions", {
  id: id(),
  assessmentId: text("assessment_id")
    .notNull()
    .references(() => assessments.id),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  fileId: text("file_id").references(() => files.id),
  answer: text("answer").default(""),
  answers: jsonb("answers").$type<Record<string, number>>().default({}),
  score: integer("score"),
  status: text("status").notNull().default("submitted"),
  feedback: text("feedback").default(""),
  reviewedBy: text("reviewed_by").references(() => profiles.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: created(),
});
export const feedback = pgTable("feedback", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: created(),
});
export const notifications = pgTable("notifications", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => profiles.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  href: text("href").notNull().default("/students"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: created(),
});
export const audit = pgTable("audit_events", {
  id: id(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityId: text("entity_id").notNull(),
  createdAt: created(),
});
