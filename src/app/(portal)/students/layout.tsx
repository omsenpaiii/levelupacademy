import Link from "next/link";
import { Shell } from "@/components/shell";
import { getUser } from "@/lib/session";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { and, eq, isNull, count } from "drizzle-orm";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const unread = user
    ? (
        await db
          .select({ n: count() })
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, user.id),
              isNull(notifications.readAt),
            ),
          )
      )[0].n
    : 0;
  return (
    <Shell user={user} unread={unread}>
      {user && !user.emailVerified && (
        <div className="notice" style={{ margin: "20px 36px 0" }}>
          Verify your email to apply for courses and save your work.{" "}
          <Link className="text-link" href="/auth/verify">
            Verify email →
          </Link>
        </div>
      )}
      {children}
    </Shell>
  );
}
