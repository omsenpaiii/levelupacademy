import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  CalendarDays,
  Heart,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  ClipboardList,
  FolderOpen,
  Bell,
} from "lucide-react";
import { Heading, Empty, Badge, ProgressBar, DateLabel } from "@/components/ui";
import { ActionForm, ActionButton } from "@/components/forms";
import { requireUser, getUser } from "@/lib/session";
import { studentData, studentAssessments, attempts } from "@/lib/data";
const resources = [
  [
    "Student handbook",
    "Your guide to studying and settling in at Level Up.",
    "https://www.levelupacademy.vic.edu.au/_files/ugd/26d308_e0cddd2f84494ebda3308cb6b8989906.pdf",
    FileText,
  ],
  [
    "Holiday calendar",
    "Plan your study around scheduled breaks.",
    "https://www.levelupacademy.vic.edu.au/_files/ugd/26d308_1a4e435eea8843e78e44e11a8fa911a3.pdf",
    CalendarDays,
  ],
  [
    "Activities calendar",
    "Make connections beyond the classroom.",
    "https://www.levelupacademy.vic.edu.au/_files/ugd/26d308_a273e47d9d9c4e7ca3a9886030712d70.pdf",
    CalendarDays,
  ],
  [
    "Class timetable",
    "Find the current ELICOS class timetable.",
    "https://www.levelupacademy.vic.edu.au/_files/ugd/26d308_e34fc96cbf3f4c88a41f5aee595b9988.pdf",
    CalendarDays,
  ],
  [
    "Mental health & wellbeing",
    "Find the support you need to feel your best.",
    "https://www.levelupacademy.vic.edu.au/mental-health-wellbeing",
    Heart,
  ],
  [
    "Student services",
    "Practical help throughout your study journey.",
    "https://www.levelupacademy.vic.edu.au/student-services",
    FolderOpen,
  ],
] as const;
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (section === "resources")
    return (
      <>
        <Heading
          title="A little help, all in one place."
          copy="The guides, dates and support to make student life a little easier."
        />
        <div className="resource-grid">
          {resources.map(([title, copy, href, Icon]) => (
            <a
              key={title}
              className="resource-link"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              <Icon />
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
              <ArrowUpRight />
            </a>
          ))}
        </div>
        <p className="text-small spaced">
          These resources open on the Academy website. Check with student
          services for the latest updates.
        </p>
      </>
    );
  if (section === "support") {
    const u = await getUser();
    return (
      <>
        <Heading
          title="You don’t have to figure it out alone."
          copy="A question about study, your enrolment or something else? We’re here to help."
        />
        <div className="two-column">
          <div className="stack">
            <div className="resource-grid">
              <a className="resource-link" href="tel:+61409485429">
                <Phone />
                <div>
                  <h3>Call student services</h3>
                  <p>
                    +61 409 485 429
                    <br />
                    Monday–Friday, 8:30 am–4:30 pm
                  </p>
                </div>
              </a>
              <a
                className="resource-link"
                href="https://www.levelupacademy.vic.edu.au/contact-us"
                target="_blank"
                rel="noreferrer"
              >
                <Mail />
                <div>
                  <h3>Contact the Academy</h3>
                  <p>Get in touch with the right team.</p>
                </div>
                <ArrowUpRight />
              </a>
            </div>
            <section className="panel panel-body">
              <h2>Share your feedback</h2>
              <p className="text-small" style={{ margin: "10px 0 24px" }}>
                Your experience matters. Tell us what’s working or where you
                need support.
              </p>
              {u ? (
                <ActionForm
                  action="feedback"
                  label="Send to student services"
                  fields={[
                    {
                      name: "subject",
                      label: "What is this about?",
                      required: true,
                    },
                    {
                      name: "message",
                      label: "How can we help?",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                />
              ) : (
                <Link className="button" href="/auth/sign-in">
                  Sign in to send feedback
                </Link>
              )}
            </section>
          </div>
          <aside className="stack">
            <div className="panel panel-body">
              <MapPin size={24} />
              <h3 className="spaced">Visit us in Melbourne</h3>
              <p className="prose spaced">
                Level 1, 51 Queen Street
                <br />
                Melbourne VIC 3000, Australia
              </p>
              <a
                className="text-link spaced"
                href="https://www.levelupacademy.vic.edu.au/campus-location"
                target="_blank"
                rel="noreferrer"
              >
                Find your campus <ArrowUpRight size={15} />
              </a>
            </div>
            <div className="panel panel-body">
              <ShieldCheck size={24} />
              <h3 className="spaced">Verify a certificate</h3>
              <p className="prose spaced">
                Contact student services with the student’s name, course,
                certificate number and approximate completion date. The Academy
                will confirm the training record.
              </p>
            </div>
          </aside>
        </div>
      </>
    );
  }
  const u = await requireUser();
  if (section === "profile")
    return (
      <div className="reading-width">
        <Heading
          title="A little more about you."
          copy="Keep your details up to date so we can support your learning."
        />
        <section className="panel panel-body">
          <div className="notice">
            Account email: {u.email}. Contact student services if this needs to
            change.
          </div>
          <ActionForm
            action="profile"
            initial={{ name: u.name, phone: u.phone, address: u.address }}
            fields={[
              { name: "name", label: "Full name", required: true },
              { name: "phone", label: "Phone number", type: "tel" },
              { name: "address", label: "Address", type: "textarea" },
            ]}
          />
        </section>
      </div>
    );
  if (section === "notifications") {
    const d = await studentData(u.id);
    return (
      <>
        <Heading
          title="Your latest updates."
          copy="Enrolment decisions and feedback, together in one place."
          action={
            <ActionButton
              action="notifications"
              input={{}}
              label="Mark all as read"
            />
          }
        />
        <section className="panel">
          {d.notifications.length ? (
            d.notifications.map((n) => (
              <Link className="list-row" key={n.id} href={n.href}>
                <Bell size={20} />
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small className="muted">
                    <DateLabel date={n.createdAt} />
                  </small>
                </div>
                {!n.readAt && <Badge tone="pending">New</Badge>}
                <ArrowRight size={15} />
              </Link>
            ))
          ) : (
            <Empty
              title="You’re all caught up."
              copy="We’ll let you know here when your application is reviewed or assessment feedback is ready."
              icon={Bell}
            />
          )}
        </section>
      </>
    );
  }
  if (section === "my-courses") {
    const d = await studentData(u.id);
    return (
      <>
        <Heading
          title="Your learning, your way."
          copy="Pick up where you left off and keep moving towards your goals."
          action={
            <Link className="button secondary" href="/students/catalogue">
              Explore courses <ArrowRight size={14} />
            </Link>
          }
        />
        {d.enrolled.length ? (
          <div className="course-grid">
            {d.enrolled.map(({ enrollment: e, course: c }) => {
              const lessons = d.lessons.filter((l) => l.courseId === c.id);
              const done = lessons.filter((l) =>
                d.progress.some((p) => p.lessonId === l.id && p.completed),
              ).length;
              return (
                <article className="course-card" key={e.id}>
                  <div className="course-photo">
                    <img src={c.image} alt="" />
                  </div>
                  <div className="course-card-body">
                    <span className="category">{c.category}</span>
                    <h3>{c.title}</h3>
                    <ProgressBar
                      value={
                        lessons.length
                          ? Math.round((done / lessons.length) * 100)
                          : 0
                      }
                    />
                    <p>
                      {done} of {lessons.length} lessons complete
                    </p>
                    <Badge tone={e.status === "active" ? "success" : "neutral"}>
                      {e.status === "active" ? "Enrolled" : "Access changed"}
                    </Badge>
                    {e.completedAt && (
                      <p>
                        Course completion recorded • Certificate{" "}
                        {e.certificateStatus}
                      </p>
                    )}
                    {e.status === "active" && (
                      <Link
                        className="button small spaced"
                        href={`/students/learn/${c.slug}`}
                      >
                        Open course <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <section className="panel">
            <Empty
              title="Your future classroom is waiting."
              copy="Choose a course and send your enrolment request. Once approved, you can access your learning here."
              href="/students/catalogue"
            />
          </section>
        )}
        {d.applications.length > 0 && (
          <>
            <div className="section-title">
              <h2>Your applications</h2>
            </div>
            <div className="panel">
              {d.applications.map(({ application: a, course: c }) => (
                <div className="list-row" key={a.id}>
                  <ClipboardList size={20} />
                  <div>
                    <h3>{c.title}</h3>
                    <p>
                      Applied <DateLabel date={a.createdAt} />
                      {a.notes ? ` · ${a.notes}` : ""}
                    </p>
                  </div>
                  <Badge
                    tone={
                      a.status === "approved"
                        ? "success"
                        : a.status === "pending"
                          ? "pending"
                          : "neutral"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </>
    );
  }
  if (section === "assessments" || section === "lln") {
    const [list, submissions] = await Promise.all([
      studentAssessments(u.id),
      attempts(u.id),
    ]);
    const filtered = list.filter(({ assessment: a }) =>
      section === "lln" ? a.kind === "lln" : a.kind !== "lln",
    );
    return (
      <>
        <Heading
          title={
            section === "lln"
              ? "Start with the right support."
              : "Small steps. Meaningful progress."
          }
          copy={
            section === "lln"
              ? "Your language, literacy and numeracy activities help us understand how you learn best."
              : "Your assessments, submissions and trainer feedback."
          }
        />
        {filtered.length ? (
          <div className="panel">
            {filtered.map(({ assessment: a, course: c }) => {
              const latest = submissions.find((s) => s.assessmentId === a.id);
              return (
                <Link
                  className="list-row"
                  href={`/students/assessments/${a.id}`}
                  key={a.id}
                >
                  <ClipboardList size={21} />
                  <div>
                    <h3>{a.title}</h3>
                    <p>
                      {c.title} · <DateLabel date={a.dueAt} />
                    </p>
                  </div>
                  <Badge
                    tone={
                      latest?.status === "satisfactory" ? "success" : "pending"
                    }
                  >
                    {latest?.status.replaceAll("_", " ") || "Not started"}
                  </Badge>
                  <ArrowRight size={16} />
                </Link>
              );
            })}
          </div>
        ) : (
          <section className="panel">
            <Empty
              title={
                section === "lln"
                  ? "Your readiness activities will appear here."
                  : "A clear desk. A fresh start."
              }
              copy={
                section === "lln"
                  ? "When your trainer assigns an approved LLN activity to your course, you can complete it here."
                  : "Published assessments for your enrolled courses will appear here. Your trainer will let you know when they’re ready."
              }
              icon={ClipboardList}
            />
          </section>
        )}
      </>
    );
  }
  notFound();
}
