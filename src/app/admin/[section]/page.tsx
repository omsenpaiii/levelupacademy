import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, desc, asc, and, ilike, or } from "drizzle-orm";
import { ArrowUpRight, Download, Search, Plus } from "lucide-react";
import { db } from "@/lib/db";
import * as s from "@/lib/schema";
import { Heading, Badge, Empty, DateLabel } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/forms";
import { ImportForm } from "@/components/import-form";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  await requireAdmin();
  const { section } = await params;
  const { q = "", archived } = await searchParams;
  if (section === "courses") {
    const list = await db
      .select()
      .from(s.courses)
      .where(
        and(
          eq(s.courses.archived, archived === "true"),
          q ? ilike(s.courses.title, `%${q}%`) : undefined,
        ),
      )
      .orderBy(asc(s.courses.title));
    return (
      <>
        <Heading
          title="Courses & content"
          copy="Build a clear learning journey, from first lesson to final assessment."
          action={
            <Link className="button" href="/admin/courses/new">
              <Plus size={15} />
              Add course
            </Link>
          }
        />
        <SearchBar q={q} archived={archived} />
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Category</th>
                <th>Status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    <small>{c.code}</small>
                  </td>
                  <td>{c.category}</td>
                  <td>
                    <Badge tone={c.published ? "success" : "pending"}>
                      {c.published ? "Published catalogue" : "Draft"}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      className="button secondary small"
                      href={`/admin/courses/${c.id}`}
                    >
                      Edit content <ArrowUpRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && (
            <Empty
              title="No courses here yet."
              copy="Try a different search or add a new course."
            />
          )}
        </div>
      </>
    );
  }
  if (section === "students") {
    const list = await db
      .select()
      .from(s.profiles)
      .where(
        and(
          eq(s.profiles.archived, archived === "true"),
          q
            ? or(
                ilike(s.profiles.name, `%${q}%`),
                ilike(s.profiles.email, `%${q}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(s.profiles.createdAt));
    return (
      <>
        <Heading
          title="People, not just profiles."
          copy="Support each student throughout their learning journey."
          action={
            <a
              className="button secondary"
              href="/api/admin/export?type=students"
            >
              <Download size={15} />
              Export students
            </a>
          }
        />
        <SearchBar q={q} archived={archived} />
        <div className="panel table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Phone</th>
                <th>Account</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.email}</small>
                  </td>
                  <td>{p.phone || "—"}</td>
                  <td>
                    <Badge>{p.role}</Badge>
                  </td>
                  <td>
                    <Link
                      className="button secondary small"
                      href={`/admin/students/${p.id}`}
                    >
                      View profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && (
            <Empty
              title="Your community starts here."
              copy="Students appear after creating an account. Archived records can be restored using the filter above."
            />
          )}
        </div>
      </>
    );
  }
  if (section === "applications") {
    const list = await db
      .select({ a: s.applications, u: s.profiles, c: s.courses })
      .from(s.applications)
      .innerJoin(s.profiles, eq(s.profiles.id, s.applications.userId))
      .innerJoin(s.courses, eq(s.courses.id, s.applications.courseId))
      .orderBy(desc(s.applications.createdAt));
    return (
      <>
        <Heading
          title="The start of something new."
          copy="Review applications and help students take their next step."
          action={
            <a
              className="button secondary"
              href="/api/admin/export?type=applications"
            >
              <Download size={15} />
              Export applications
            </a>
          }
        />
        {list.length ? (
          list.map(({ a, u, c }) => (
            <details key={a.id}>
              <summary>
                {u.name} · {c.title}{" "}
                <Badge tone={a.status === "pending" ? "pending" : "neutral"}>
                  {a.status}
                </Badge>
              </summary>
              <div className="two-column">
                <div className="prose">
                  <strong>{u.email}</strong>
                  <br />
                  {Object.entries(a.details).map(([k, v]) => (
                    <p key={k} className="spaced">
                      <strong>{k.replace(/([A-Z])/g, " $1")}: </strong>
                      {v || "Not provided"}
                    </p>
                  ))}
                </div>
                <ActionForm
                  action="admin.application"
                  initial={{ id: a.id, status: a.status, notes: a.notes }}
                  fields={[
                    {
                      name: "status",
                      label: "Decision",
                      type: "select",
                      options: [
                        { value: "pending", label: "Pending review" },
                        {
                          value: "approved",
                          label: "Approve and grant course access",
                        },
                        { value: "declined", label: "Decline application" },
                      ],
                    },
                    {
                      name: "notes",
                      label: "Message to the student",
                      type: "textarea",
                    },
                  ]}
                  label="Save decision"
                />
              </div>
            </details>
          ))
        ) : (
          <div className="panel">
            <Empty
              title="Your admissions queue is clear."
              copy="Student enrolment requests will appear here for review."
            />
          </div>
        )}
      </>
    );
  }
  if (section === "enrollments") {
    const [list, users, courses] = await Promise.all([
      db
        .select({ e: s.enrollments, u: s.profiles, c: s.courses })
        .from(s.enrollments)
        .innerJoin(s.profiles, eq(s.enrollments.userId, s.profiles.id))
        .innerJoin(s.courses, eq(s.enrollments.courseId, s.courses.id))
        .orderBy(desc(s.enrollments.createdAt)),
      db.select().from(s.profiles).where(eq(s.profiles.archived, false)),
      db.select().from(s.courses).where(eq(s.courses.archived, false)),
    ]);
    return (
      <>
        <Heading
          title="Enrolments & completion"
          copy="Manage course access and record outcomes after trainer review."
          action={
            <a
              className="button secondary"
              href="/api/admin/export?type=enrollments"
            >
              <Download size={15} />
              Export enrolments
            </a>
          }
        />
        <details>
          <summary>Assign a course to a student</summary>
          <div>
            <EnrollmentForm users={users} courses={courses} />
          </div>
        </details>
        {list.length ? (
          list.map(({ e, u, c }) => (
            <details key={e.id}>
              <summary>
                {u.name} · {c.title}{" "}
                <Badge tone={e.status === "active" ? "success" : "neutral"}>
                  {e.status}
                </Badge>
              </summary>
              <div>
                <EnrollmentForm
                  users={users}
                  courses={courses}
                  initial={{ ...e, completed: !!e.completedAt }}
                />
              </div>
            </details>
          ))
        ) : (
          <div className="panel">
            <Empty
              title="Learning journeys begin here."
              copy="Approve an application or assign a course to an active student."
            />
          </div>
        )}
      </>
    );
  }
  if (section === "assessments") {
    const list = await db
      .select({
        sub: s.submissions,
        u: s.profiles,
        a: s.assessments,
        c: s.courses,
      })
      .from(s.submissions)
      .innerJoin(s.profiles, eq(s.submissions.userId, s.profiles.id))
      .innerJoin(
        s.assessments,
        eq(s.submissions.assessmentId, s.assessments.id),
      )
      .innerJoin(s.courses, eq(s.assessments.courseId, s.courses.id))
      .orderBy(desc(s.submissions.createdAt));
    return (
      <>
        <Heading
          title="Feedback that moves learning forward."
          copy="Review student work, recognise progress, and guide the next attempt."
          action={
            <a
              className="button secondary"
              href="/api/admin/export?type=submissions"
            >
              <Download size={15} />
              Export results
            </a>
          }
        />
        {list.length ? (
          list.map(({ sub, u, a, c }) => (
            <details key={sub.id}>
              <summary>
                {u.name} · {a.title}{" "}
                <Badge
                  tone={sub.status === "satisfactory" ? "success" : "pending"}
                >
                  {sub.status.replaceAll("_", " ")}
                </Badge>
              </summary>
              <div className="two-column">
                <div>
                  <p className="text-small muted">
                    {c.title} · <DateLabel date={sub.createdAt} />
                  </p>
                  <p className="prose spaced">{sub.answer}</p>
                  {sub.score !== null && (
                    <h3 className="spaced">LLN score: {sub.score}%</h3>
                  )}
                  {a.kind === "lln" &&
                    a.questions.map((question) => (
                      <p className="prose spaced" key={question.id}>
                        <strong>{question.prompt}</strong>
                        <br />
                        Response:{" "}
                        {question.options[sub.answers?.[question.id] ?? -1] ||
                          "Not answered"}
                      </p>
                    ))}
                  {sub.fileId && (
                    <a
                      className="button secondary spaced"
                      href={`/api/files/${sub.fileId}`}
                    >
                      <Download size={15} />
                      Download submission
                    </a>
                  )}
                </div>
                <ActionForm
                  action="admin.review"
                  initial={{
                    id: sub.id,
                    status:
                      sub.status === "submitted" ? "satisfactory" : sub.status,
                    feedback: sub.feedback,
                  }}
                  fields={[
                    {
                      name: "status",
                      label: "Assessment outcome",
                      type: "select",
                      options: [
                        { value: "satisfactory", label: "Satisfactory" },
                        {
                          value: "not_satisfactory",
                          label: "Not satisfactory — allow resubmission",
                        },
                      ],
                    },
                    {
                      name: "feedback",
                      label: "Feedback for the student",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                  label="Save review"
                />
              </div>
            </details>
          ))
        ) : (
          <div className="panel">
            <Empty
              title="No work waiting for review."
              copy="Student submissions and LLN results will appear here."
            />
          </div>
        )}
      </>
    );
  }
  if (section === "feedback") {
    const list = await db
      .select({ f: s.feedback, u: s.profiles })
      .from(s.feedback)
      .innerJoin(s.profiles, eq(s.feedback.userId, s.profiles.id))
      .orderBy(desc(s.feedback.createdAt));
    return (
      <>
        <Heading
          title="Listen. Support. Improve."
          copy="Student feedback and support requests."
        />
        {list.length ? (
          list.map(({ f, u }) => (
            <article className="panel panel-body spaced" key={f.id}>
              <Badge tone={f.status === "open" ? "pending" : "success"}>
                {f.status}
              </Badge>
              <h3 className="spaced">{f.subject}</h3>
              <p className="text-small">
                {u.name} · {u.email}
              </p>
              <p className="prose spaced">{f.message}</p>
              <div className="spaced">
                <ActionButton
                  action="admin.feedback"
                  input={{
                    id: f.id,
                    status: f.status === "open" ? "resolved" : "open",
                  }}
                  label={f.status === "open" ? "Mark resolved" : "Reopen"}
                />
              </div>
            </article>
          ))
        ) : (
          <div className="panel">
            <Empty
              title="You’re up to date."
              copy="Messages from your students will appear here."
            />
          </div>
        )}
      </>
    );
  }
  if (section === "import")
    return (
      <>
        <Heading
          title="Less admin. More impact."
          copy="Bring in enrolments and keep your records moving with Excel."
        />
        <div className="two-column">
          <section className="panel panel-body">
            <h2>Import enrolments</h2>
            <p className="prose spaced">
              Use the template to assign courses to existing student accounts.
              Preview every row before applying changes. Students must register
              first; importing does not create passwords or send invitations.
            </p>
            <a
              className="button secondary spaced"
              href="/api/admin/export?type=template"
            >
              <Download size={15} />
              Download template
            </a>
            <div className="spaced">
              <ImportForm />
            </div>
          </section>
          <aside className="panel panel-body">
            <h2>Export records</h2>
            <div className="stack spaced">
              {["students", "applications", "enrollments", "submissions"].map(
                (type) => (
                  <a
                    className="button secondary"
                    key={type}
                    href={`/api/admin/export?type=${type}`}
                  >
                    <Download size={14} />
                    {type === "enrollments"
                      ? "Enrolments"
                      : type[0].toUpperCase() + type.slice(1)}
                  </a>
                ),
              )}
            </div>
          </aside>
        </div>
      </>
    );
  notFound();
}
function SearchBar({ q, archived }: { q: string; archived?: string }) {
  return (
    <form className="row-actions" style={{ marginBottom: 22 }}>
      <label className="catalogue-search">
        <Search size={16} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search records…"
          aria-label="Search records"
        />
      </label>
      <select
        name="archived"
        className="filter-chip"
        defaultValue={archived || "false"}
        aria-label="Archive filter"
      >
        <option value="false">Active records</option>
        <option value="true">Archived records</option>
      </select>
      <button className="button secondary">Search</button>
    </form>
  );
}
function EnrollmentForm({
  users,
  courses,
  initial = {},
}: {
  users: { id: string; name: string; email: string }[];
  courses: { id: string; title: string }[];
  initial?: Record<string, unknown>;
}) {
  return (
    <ActionForm
      action="admin.enrollment"
      initial={{
        status: "active",
        certificateStatus: "not-issued",
        completed: false,
        ...initial,
      }}
      fields={[
        {
          name: "userId",
          label: "Student",
          type: "select",
          required: true,
          options: [
            { value: "", label: "Select student" },
            ...users.map((u) => ({
              value: u.id,
              label: `${u.name} (${u.email})`,
            })),
          ],
        },
        {
          name: "courseId",
          label: "Course",
          type: "select",
          required: true,
          options: [
            { value: "", label: "Select course" },
            ...courses.map((c) => ({ value: c.id, label: c.title })),
          ],
        },
        {
          name: "status",
          label: "Access",
          type: "select",
          options: [
            { value: "active", label: "Active" },
            { value: "revoked", label: "Revoked" },
          ],
        },
        {
          name: "completed",
          label: "Trainer has confirmed course completion",
          type: "checkbox",
        },
        {
          name: "certificateStatus",
          label: "Certificate status",
          type: "select",
          options: [
            { value: "not-issued", label: "Not issued" },
            { value: "pending", label: "Pending" },
            { value: "issued", label: "Issued" },
          ],
        },
        { name: "certificateNumber", label: "Certificate number" },
      ]}
    />
  );
}
