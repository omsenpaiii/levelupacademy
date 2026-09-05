import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, and, desc } from "drizzle-orm";
import { ArrowLeft, Download, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { assertAccess, attempts } from "@/lib/data";
import { db } from "@/lib/db";
import * as s from "@/lib/schema";
import { Heading, Badge, DateLabel } from "@/components/ui";
import { AssessmentForm } from "@/components/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const u = await requireUser();
  const a = await db.query.assessments.findFirst({
    where: and(
      eq(s.assessments.id, (await params).id),
      eq(s.assessments.published, true),
    ),
  });
  if (!a) notFound();
  try {
    await assertAccess(u.id, a.courseId);
  } catch {
    notFound();
  }
  const [history, resources] = await Promise.all([
    attempts(u.id, a.id),
    db
      .select()
      .from(s.files)
      .where(and(eq(s.files.assessmentId, a.id), eq(s.files.kind, "resource")))
      .orderBy(desc(s.files.createdAt)),
  ]);
  const latest = history[0];
  return (
    <>
      <Link
        className="back-link"
        href={a.kind === "lln" ? "/students/lln" : "/students/assessments"}
      >
        <ArrowLeft size={14} />
        All {a.kind === "lln" ? "readiness activities" : "assessments"}
      </Link>
      <Heading
        title={a.title}
        copy={
          a.kind === "lln"
            ? "Take your time. This activity helps your trainer identify the right support for you."
            : "Read the instructions, prepare your work, and submit when you’re ready."
        }
      />
      <div className="two-column">
        <div className="stack">
          <section className="panel panel-body">
            <h2>Instructions</h2>
            <p className="prose spaced">{a.instructions}</p>
            {resources
              .filter((r) => r.size > 0)
              .map((r) => (
                <a
                  key={r.id}
                  className="resource-link spaced"
                  href={`/api/files/${r.id}`}
                >
                  <Download size={18} />
                  <div>
                    <h3>{r.title}</h3>
                    <p>Download assessment resource</p>
                  </div>
                </a>
              ))}
          </section>
          <section className="panel panel-body">
            <h2 style={{ marginBottom: 23 }}>Your submission</h2>
            {latest && ["submitted", "satisfactory"].includes(latest.status) ? (
              <div className="notice success">
                <CheckCircle2 size={18} />
                {latest.status === "submitted"
                  ? "Your work is with your trainer. Feedback will appear here when it’s reviewed."
                  : "This assessment has a satisfactory outcome."}
              </div>
            ) : (
              <AssessmentForm
                assessment={{
                  id: a.id,
                  courseId: a.courseId,
                  kind: a.kind,
                  questions: a.questions.map((q) => ({
                    id: q.id,
                    prompt: q.prompt,
                    options: q.options,
                  })),
                }}
              />
            )}
          </section>
        </div>
        <aside className="stack">
          <section className="panel panel-body">
            <h3>Assessment details</h3>
            <div className="detail-facts">
              <div>
                <span>Due date</span>
                <strong>
                  <DateLabel date={a.dueAt} />
                </strong>
              </div>
              <div>
                <span>Status</span>
                <Badge
                  tone={
                    latest?.status === "satisfactory" ? "success" : "pending"
                  }
                >
                  {latest?.status.replaceAll("_", " ") || "Not started"}
                </Badge>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>Submission history</h2>
            </div>
            {history.length ? (
              history.map((sub, i) => (
                <div
                  className="panel-body"
                  key={sub.id}
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <Badge>Attempt {history.length - i}</Badge>
                  <p className="text-small spaced">
                    <DateLabel date={sub.createdAt} />
                  </p>
                  {sub.score !== null && (
                    <h3 className="spaced">Score: {sub.score}%</h3>
                  )}
                  <p className="prose spaced">
                    {sub.feedback || "Feedback will appear here after review."}
                  </p>
                  {sub.fileId && (
                    <a
                      className="text-link spaced"
                      href={`/api/files/${sub.fileId}`}
                    >
                      Your submitted file <Download size={13} />
                    </a>
                  )}
                  {sub.answer && (
                    <details className="spaced">
                      <summary>Your response</summary>
                      <div className="prose">{sub.answer}</div>
                    </details>
                  )}
                </div>
              ))
            ) : (
              <p className="panel-body text-small muted">
                Your attempts will appear here.
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
