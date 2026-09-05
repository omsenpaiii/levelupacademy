import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Heading, Badge } from "@/components/ui";
import { ActionForm } from "@/components/forms";
import { courseBySlug, activeEnrollment } from "@/lib/data";
import { getUser } from "@/lib/session";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await courseBySlug((await params).slug);
  if (!c) notFound();
  const u = await getUser();
  const enrolled = u ? await activeEnrollment(u.id, c.id) : null;
  return (
    <>
      <Link className="back-link" href="/students/catalogue">
        <ArrowLeft size={14} />
        Course catalogue
      </Link>
      <Heading title={c.title} copy={c.summary} />
      <div className="two-column">
        <div className="stack">
          <div className="detail-hero">
            <img src={c.image} alt={c.title} />
          </div>
          <section className="panel panel-body">
            <h2>About this course</h2>
            <p className="prose spaced">{c.description}</p>
          </section>
          <details>
            <summary>Entry requirements</summary>
            <div className="prose">{c.requirements}</div>
          </details>
          {!!c.units?.length && (
            <details>
              <summary>Units of competency</summary>
              <div>
                {c.units.map((unit) => (
                  <p key={unit.code} className="prose">
                    {unit.code} — {unit.title}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
        <aside className="stack">
          <div className="panel panel-body">
            <Badge>{c.category}</Badge>
            <div className="detail-facts">
              <div>
                <span>Course code</span>
                <strong>{c.code || "See course information"}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{c.duration}</strong>
              </div>
              <div>
                <span>Delivery</span>
                <strong>{c.delivery}</strong>
              </div>
              <div>
                <span>Location</span>
                <strong>Melbourne CBD</strong>
              </div>
            </div>
            {enrolled ? (
              <Link href={`/students/learn/${c.slug}`} className="button">
                Open your course
              </Link>
            ) : !u ? (
              <Link href="/auth/sign-up" className="button">
                Create an account to apply
              </Link>
            ) : (
              <a href="#application" className="button">
                Request enrolment
              </a>
            )}
            <a
              href={c.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Full course information <ArrowUpRight size={14} />
            </a>
          </div>
          {u && !enrolled && (
            <section id="application" className="panel panel-body">
              <h2>Take the next step.</h2>
              <p className="text-small spaced" style={{ marginBottom: 22 }}>
                Tell admissions about your goals. Your place and course access
                will be confirmed after review.
              </p>
              <ActionForm
                action="apply"
                initial={{ courseId: c.id }}
                label="Send application"
                fields={[
                  {
                    name: "goals",
                    label: "What would you like to achieve?",
                    type: "textarea",
                    required: true,
                  },
                  {
                    name: "experience",
                    label: "Previous study or experience",
                    type: "textarea",
                  },
                  {
                    name: "preferredStart",
                    label: "Preferred start date",
                    type: "date",
                  },
                  {
                    name: "support",
                    label: "Learning support you would like to discuss",
                    type: "textarea",
                  },
                  {
                    name: "consent",
                    label:
                      "I confirm these details are correct and agree to be contacted about this application.",
                    type: "checkbox",
                    required: true,
                  },
                ]}
              />
            </section>
          )}
          <div className="notice">
            Have a question about entry requirements or your study pathway? Our
            admissions team can help.
          </div>
        </aside>
      </div>
    </>
  );
}
