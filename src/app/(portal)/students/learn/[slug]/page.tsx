import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, asc } from "drizzle-orm";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  CheckCircle2,
  ClipboardList,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { courseBySlug, assertAccess } from "@/lib/data";
import { db } from "@/lib/db";
import * as s from "@/lib/schema";
import { Heading, Empty, ProgressBar } from "@/components/ui";
import { ActionButton } from "@/components/forms";
import { ResourceList } from "@/components/resource-list";
import { lessonResources } from "@/lib/resources";
import { videoEmbed } from "@/lib/validation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const u = await requireUser();
  const c = await courseBySlug((await params).slug);
  if (!c) notFound();
  try {
    await assertAccess(u.id, c.id);
  } catch {
    notFound();
  }
  const [lessons, progress, resources, modules] = await Promise.all([
    db
      .select()
      .from(s.lessons)
      .where(and(eq(s.lessons.courseId, c.id), eq(s.lessons.published, true)))
      .orderBy(asc(s.lessons.position)),
    db.select().from(s.progress).where(eq(s.progress.userId, u.id)),
    db
      .select()
      .from(s.files)
      .where(and(eq(s.files.courseId, c.id), eq(s.files.kind, "resource"))),
    db
      .select()
      .from(s.modules)
      .where(eq(s.modules.courseId, c.id))
      .orderBy(asc(s.modules.position)),
  ]);
  const lessonParam = (await searchParams).lesson;
  const current = lessons.find((l) => l.id === lessonParam) || lessons[0];
  const done = lessons.filter((l) =>
    progress.some((p) => p.lessonId === l.id && p.completed),
  );
  const completed = current && done.some((l) => l.id === current.id);
  const embed = current?.videoUrl ? videoEmbed(current.videoUrl) : null;
  const next = current ? lessons[lessons.indexOf(current) + 1] : null;
  const downloads = lessonResources(resources, current?.id || "");
  const unitAssessments = current
    ? await db
        .selectDistinct({ id: s.assessments.id, title: s.assessments.title })
        .from(s.assessments)
        .innerJoin(s.files, eq(s.files.assessmentId, s.assessments.id))
        .where(
          and(
            eq(s.files.lessonId, current.id),
            eq(s.assessments.courseId, c.id),
            eq(s.assessments.published, true),
          ),
        )
    : [];
  return (
    <>
      <Link className="back-link" href="/students/my-courses">
        <ArrowLeft size={14} />
        My courses
      </Link>
      <Heading
        title={c.title}
        copy={current ? current.title : "Your learning workspace"}
      />
      {current ? (
        <div className="learn-layout">
          <div>
            <section>
              {embed && (
                <div className="video-frame">
                  <iframe
                    src={embed}
                    title={current.title}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              )}
              <div className="panel panel-body">
                <h2>{current.title}</h2>
                <p className="prose spaced">{current.body}</p>
                <div className="form-actions spaced">
                  <ActionButton
                    action="progress"
                    input={{
                      lessonId: current.id,
                      completed: !completed,
                      seconds: 0,
                    }}
                    label={
                      completed ? "Mark as incomplete" : "Mark lesson complete"
                    }
                    className="button"
                  />
                  {next && (
                    <Link
                      className="button secondary"
                      href={`?lesson=${next.id}`}
                    >
                      Next lesson <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </section>
            {downloads.unit.length > 0 && (
              <section
                className="unit-downloads"
                aria-label="Unit learning resources"
              >
                <div className="section-title">
                  <h2>Unit resources</h2>
                  <span className="badge">{downloads.unit.length} files</span>
                </div>
                <p className="text-small muted resource-intro">
                  Start with the learner guide, then work through the
                  presentation, self-study guide and class activities with your
                  trainer.
                </p>
                <ResourceList resources={downloads.unit} />
              </section>
            )}
            {unitAssessments.map((a) => (
              <section className="unit-assessment panel panel-body" key={a.id}>
                <span className="category">
                  <ClipboardList size={15} /> Assessment
                </span>
                <h2>{a.title}</h2>
                <p className="prose spaced">
                  Read the student pack and follow your trainer’s instructions.
                  Submit your completed work for review; practical tasks are
                  assessed by your trainer.
                </p>
                <Link
                  className="button spaced"
                  href={`/students/assessments/${a.id}`}
                >
                  Open assessment <ArrowRight size={15} />
                </Link>
              </section>
            ))}
            <section aria-label="Shared course resources">
              <div className="section-title">
                <h2>Course resources</h2>
              </div>
              {downloads.course.length ? (
                <ResourceList resources={downloads.course} />
              ) : (
                <p className="text-small muted">
                  Your trainer hasn’t added any shared course downloads yet.
                </p>
              )}
            </section>
          </div>
          <aside className="panel">
            <div className="panel-body">
              <h3>Your course</h3>
              <p className="text-small spaced">
                {done.length} of {lessons.length} lessons complete
              </p>
              <ProgressBar
                value={Math.round((done.length / lessons.length) * 100)}
              />
            </div>
            <ol className="lesson-nav">
              {[
                ...modules.map((m) => ({ id: m.id, title: m.title })),
                { id: null, title: "Lessons" },
              ].map((m) => {
                const group = lessons.filter((l) => l.moduleId === m.id);
                return group.length ? (
                  <li key={m.id || "ungrouped"}>
                    <div className="sidebar-label" style={{ marginTop: 15 }}>
                      {m.title}
                    </div>
                    {group.map((l) => (
                      <Link
                        key={l.id}
                        href={`?lesson=${l.id}`}
                        className={l.id === current.id ? "active" : ""}
                      >
                        {done.some((p) => p.id === l.id) ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <Play size={15} />
                        )}
                        <span>{l.title}</span>
                      </Link>
                    ))}
                  </li>
                ) : null;
              })}
            </ol>
            <div className="panel-body">
              <Link className="text-link" href="/students/assessments">
                Go to assessments <ArrowRight size={14} />
              </Link>
            </div>
          </aside>
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="Your next chapter is being prepared."
            copy="You’re enrolled. Your trainer will publish your lessons and resources here when they’re ready."
            href="/students/support"
            label="Contact student services"
          />
        </section>
      )}
    </>
  );
}
