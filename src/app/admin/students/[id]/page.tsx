import { requireAdmin } from "@/lib/session";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { studentData } from "@/lib/data";
import { Heading, Badge, DateLabel } from "@/components/ui";
import { ActionForm } from "@/components/forms";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const u = await db.query.profiles.findFirst({
    where: eq(profiles.id, (await params).id),
  });
  if (!u) notFound();
  const d = await studentData(u.id);
  return (
    <>
      <Heading title={u.name} copy={u.email} />
      <div className="two-column">
        <section className="panel panel-body">
          <h2 style={{ marginBottom: 25 }}>Student details</h2>
          <ActionForm
            action="admin.student"
            initial={u}
            fields={[
              { name: "name", label: "Full name", required: true },
              { name: "phone", label: "Phone", type: "tel" },
              { name: "address", label: "Address", type: "textarea" },
              {
                name: "archived",
                label: "Archive student and suspend portal access",
                type: "checkbox",
              },
            ]}
          />
        </section>
        <aside className="panel">
          <div className="panel-header">
            <h2>Learning record</h2>
          </div>
          {d.enrolled.length ? (
            d.enrolled.map(({ course: c, enrollment: e }) => (
              <div className="panel-body" key={e.id}>
                <h3>{c.title}</h3>
                <p className="text-small spaced">
                  Enrolled <DateLabel date={e.createdAt} />
                </p>
                <Badge>{e.status}</Badge>
                <p className="text-small spaced">
                  Certificate: {e.certificateStatus}
                </p>
              </div>
            ))
          ) : (
            <p className="panel-body muted">No enrolments yet.</p>
          )}
        </aside>
      </div>
    </>
  );
}
