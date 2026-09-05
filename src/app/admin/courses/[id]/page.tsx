import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/lib/db";
import * as s from "@/lib/schema";
import { Heading, Badge } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import {
  CourseEditor,
  LessonEditor,
  AssessmentEditor,
  ResourceUpload,
} from "@/components/admin-editors";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (id === "new")
    return (
      <>
        <Heading title="Make space for a new course." />
        <section className="panel panel-body reading-width">
          <CourseEditor
            course={{
              slug: "",
              title: "",
              code: "",
              category: "English language",
              summary: "",
              description: "",
              duration: "",
              delivery: "On campus",
              requirements: "",
              sourceUrl: "https://www.levelupacademy.vic.edu.au/",
              image: "/images/campus.jpg",
              published: false,
              archived: false,
            }}
          />
        </section>
      </>
    );
  const c = await db.query.courses.findFirst({ where: eq(s.courses.id, id) });
  if (!c) notFound();
  const [modules, lessons, assessments, files] = await Promise.all([
    db
      .select()
      .from(s.modules)
      .where(eq(s.modules.courseId, id))
      .orderBy(asc(s.modules.position)),
    db
      .select()
      .from(s.lessons)
      .where(eq(s.lessons.courseId, id))
      .orderBy(asc(s.lessons.position)),
    db.select().from(s.assessments).where(eq(s.assessments.courseId, id)),
    db.select().from(s.files).where(eq(s.files.courseId, id)),
  ]);
  return (
    <>
      <Link className="back-link" href="/admin/courses">
        <ArrowLeft size={14} />
        All courses
      </Link>
      <Heading
        title={c.title}
        copy="Create, review and publish the materials your students need."
      />
      <div className="notice">
        Only publish approved learning materials. Catalogue details are separate
        from lessons and assessments.
      </div>
      <details>
        <summary>Course information & publishing</summary>
        <div>
          <CourseEditor course={c} />
        </div>
      </details>
      <div className="section-title">
        <h2>Learning modules</h2>
        <Badge>{modules.length} modules</Badge>
      </div>
      <details>
        <summary>Add a module</summary>
        <div>
          <ActionForm
            action="admin.module"
            initial={{ courseId: id, position: modules.length }}
            fields={[
              { name: "title", label: "Module title", required: true },
              { name: "position", label: "Order", type: "number" },
            ]}
            label="Add module"
          />
        </div>
      </details>
      {modules.map((m) => (
        <p className="prose" key={m.id}>
          {m.position + 1}. {m.title}
        </p>
      ))}
      <div className="section-title">
        <h2>Lessons</h2>
        <Badge>{lessons.filter((l) => l.published).length} published</Badge>
      </div>
      {lessons.map((l) => (
        <details key={l.id}>
          <summary>
            {l.title}{" "}
            <Badge tone={l.published ? "success" : "pending"}>
              {l.published ? "Published" : "Draft"}
            </Badge>
          </summary>
          <div>
            <LessonEditor courseId={id} modules={modules} lesson={l} />
          </div>
        </details>
      ))}
      <details>
        <summary>Add a lesson</summary>
        <div>
          <LessonEditor courseId={id} modules={modules} />
        </div>
      </details>
      <div className="section-title">
        <h2>Assessments & LLN</h2>
        <Badge>{assessments.length} activities</Badge>
      </div>
      {assessments.map((a) => (
        <details key={a.id}>
          <summary>
            {a.title}{" "}
            <Badge tone={a.published ? "success" : "pending"}>
              {a.published ? "Published" : "Draft"}
            </Badge>
          </summary>
          <div className="stack">
            <AssessmentEditor
              courseId={id}
              assessment={{
                ...a,
                dueAt: a.dueAt?.toISOString().slice(0, 10) || null,
              }}
            />
            <ResourceUpload courseId={id} assessmentId={a.id} />
          </div>
        </details>
      ))}
      <details>
        <summary>Add an assessment or LLN activity</summary>
        <div>
          <AssessmentEditor courseId={id} />
        </div>
      </details>
      <div className="section-title">
        <h2>Learning resources</h2>
      </div>
      <section className="panel panel-body">
        <ResourceUpload courseId={id} />
        {files
          .filter((f) => f.kind === "resource" && f.size > 0)
          .map((f) => (
            <a
              className="resource-link spaced"
              key={f.id}
              href={`/api/files/${f.id}`}
            >
              <Download size={15} />
              <div>
                <h3>{f.title}</h3>
              </div>
            </a>
          ))}
      </section>
    </>
  );
}
