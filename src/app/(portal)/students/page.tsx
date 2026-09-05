import Link from "next/link";
import { ArrowRight, ChevronRight, Check } from "lucide-react";
import { Heading, CourseCard, Empty, ProgressBar } from "@/components/ui";
import { getUser } from "@/lib/session";
import { catalogue, studentData } from "@/lib/data";
export default async function Dashboard() {
  const user = await getUser();
  const [courses, data] = await Promise.all([
    catalogue(),
    user ? studentData(user.id) : null,
  ]);
  const enrolled =
    data?.enrolled.filter((e) => e.enrollment.status === "active") || [];
  const featured = [
    "general-english-elicos",
    "certificate-lll-in-individual-support",
    "diploma-of-project-management",
  ]
    .map((slug) => courses.find((c) => c.slug === slug))
    .filter((c) => !!c);
  return (
    <>
      <Heading
        title={
          user
            ? `A new day. A step forward, ${user.name.split(" ")[0]}.`
            : "Your next chapter starts here."
        }
        copy="Your learning, your progress. All in one place."
        action={
          <span className="date-label">
            {new Intl.DateTimeFormat("en-AU", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Australia/Melbourne",
            }).format(new Date())}
          </span>
        }
      />
      <section className="welcome-banner">
        <div className="banner-copy">
          <h2>
            Make room for
            <br />
            your next move.
          </h2>
          <p>A new skill. A fresh perspective. A future that’s yours.</p>
          <Link className="button" href="/students/catalogue">
            Explore courses <ArrowRight size={14} />
          </Link>
        </div>
        <div className="banner-photo">
          <img
            src="/images/students.jpg"
            alt="Learning together at Level Up Academy"
            fetchPriority="high"
          />
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Your learning</h2>
            {enrolled.length > 0 && (
              <Link className="text-link" href="/students/my-courses">
                View all <ArrowRight size={13} />
              </Link>
            )}
          </div>
          {enrolled.length ? (
            enrolled.slice(0, 2).map(({ course }) => {
              const lessons = data!.lessons.filter(
                (l) => l.courseId === course.id,
              );
              const completed = lessons.filter((l) =>
                data!.progress.some((p) => p.lessonId === l.id && p.completed),
              ).length;
              const percent = lessons.length
                ? Math.round((completed / lessons.length) * 100)
                : 0;
              return (
                <div className="panel-body" key={course.id}>
                  <span className="category">{course.category}</span>
                  <h3>{course.title}</h3>
                  <ProgressBar value={percent} />
                  <p className="text-small">
                    {lessons.length
                      ? `${completed} of ${lessons.length} lessons complete`
                      : "Your lessons are being prepared."}
                  </p>
                  <Link
                    className="button small spaced"
                    href={`/students/learn/${course.slug}`}
                  >
                    Continue learning <ArrowRight size={14} />
                  </Link>
                </div>
              );
            })
          ) : (
            <Empty
              title="A little curiosity goes a long way."
              copy="Find a course that fits your future. Once your enrolment is approved, your learning will appear here."
              href="/students/catalogue"
              label="Browse courses"
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Your next steps</h2>
            <span className="badge">Let’s get started</span>
          </div>
          <div className="steps">
            {[
              [
                user ? "/students/profile" : "/auth/sign-up",
                "Complete your profile",
                "Tell us a bit about yourself so we can support your journey.",
                !!user?.phone,
              ],
              [
                "/students/catalogue",
                "Find your course",
                "Explore our courses and find the right fit for your goals.",
                enrolled.length > 0,
              ],
              [
                user ? "/students/my-courses" : "/auth/sign-in",
                "Start learning",
                "Once enrolled, your learning content will appear here.",
                !!data?.progress.some((p) => p.completed),
              ],
            ].map(([href, title, copy, done], i) => (
              <Link href={String(href)} className="step" key={String(title)}>
                <span className="step-num">
                  {done ? <Check size={14} /> : i + 1}
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{copy}</p>
                </div>
                <ChevronRight size={14} />
              </Link>
            ))}
          </div>
        </section>
      </div>
      {data &&
        data.applications.some((a) => a.application.status === "pending") && (
          <div className="notice">
            Your enrolment application is with admissions.{" "}
            <Link href="/students/my-courses" className="text-link">
              View application <ArrowRight size={12} />
            </Link>
          </div>
        )}
      <div className="section-title">
        <h2>Explore your possibilities</h2>
        <Link className="text-link" href="/students/catalogue">
          All courses <ArrowRight size={14} />
        </Link>
      </div>
      <div className="course-grid">
        {featured.map((c) => (
          <CourseCard key={c.id} course={c} compact />
        ))}
      </div>
    </>
  );
}
