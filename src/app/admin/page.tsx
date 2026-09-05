import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { count, eq, and, desc } from "drizzle-orm";
import {
  Users,
  Inbox,
  BookOpen,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/db";
import * as s from "@/lib/schema";
import { Heading, Badge, Empty, DateLabel } from "@/components/ui";
export default async function Page() {
  await requireAdmin();
  const [students, applications, courses, submissions, recent] =
    await Promise.all([
      db
        .select({ n: count() })
        .from(s.profiles)
        .where(
          and(eq(s.profiles.role, "student"), eq(s.profiles.archived, false)),
        ),
      db
        .select({ n: count() })
        .from(s.applications)
        .where(eq(s.applications.status, "pending")),
      db
        .select({ n: count() })
        .from(s.courses)
        .where(eq(s.courses.archived, false)),
      db
        .select({ n: count() })
        .from(s.submissions)
        .where(eq(s.submissions.status, "submitted")),
      db
        .select({
          application: s.applications,
          student: s.profiles,
          course: s.courses,
        })
        .from(s.applications)
        .innerJoin(s.profiles, eq(s.applications.userId, s.profiles.id))
        .innerJoin(s.courses, eq(s.applications.courseId, s.courses.id))
        .orderBy(desc(s.applications.createdAt))
        .limit(5),
    ]);
  return (
    <>
      <Heading
        title="Every student. A possibility."
        copy="A clear view of your Academy, and the next things that need your attention."
        action={
          <Link className="button" href="/admin/courses">
            Manage learning <ArrowRight size={14} />
          </Link>
        }
      />
      <div className="stat-grid">
        {[
          ["Active students", students[0].n, Users, "/admin/students"],
          [
            "Applications to review",
            applications[0].n,
            Inbox,
            "/admin/applications",
          ],
          ["Courses in catalogue", courses[0].n, BookOpen, "/admin/courses"],
          [
            "Assessments to review",
            submissions[0].n,
            ClipboardList,
            "/admin/assessments",
          ],
        ].map(([label, n, Icon, href]) => {
          const I = Icon as typeof Users;
          return (
            <Link key={String(label)} className="stat" href={String(href)}>
              <span>
                {String(label)}
                <I size={17} />
              </span>
              <strong>{Number(n)}</strong>
            </Link>
          );
        })}
      </div>
      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Latest applications</h2>
            <Link className="text-link" href="/admin/applications">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recent.length ? (
            recent.map(({ application: a, student: u, course: c }) => (
              <Link className="list-row" href="/admin/applications" key={a.id}>
                <span className="avatar">{u.name[0]}</span>
                <div>
                  <h3>{u.name}</h3>
                  <p>{c.title}</p>
                  <small className="muted">
                    <DateLabel date={a.createdAt} />
                  </small>
                </div>
                <Badge tone={a.status === "pending" ? "pending" : "success"}>
                  {a.status}
                </Badge>
              </Link>
            ))
          ) : (
            <Empty
              title="Ready for your next intake."
              copy="New student applications will appear here for your admissions team to review."
              icon={Inbox}
            />
          )}
        </section>
        <aside className="panel panel-body">
          <Badge tone="pending">Content readiness</Badge>
          <h2 className="spaced">Bring your courses to life.</h2>
          <p className="prose spaced">
            Your course catalogue is ready. Add approved lessons, learner guides
            and assessments before students start learning.
          </p>
          <Link className="button secondary spaced" href="/admin/courses">
            Review course content <ArrowRight size={14} />
          </Link>
        </aside>
      </div>
    </>
  );
}
