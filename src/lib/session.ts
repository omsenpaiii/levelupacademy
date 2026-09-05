import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth/server";
import { db } from "./db";
import { profiles } from "./schema";
export const getUser = cache(async () => {
  const { data } = await auth.getSession();
  const u = data?.user;
  if (!u) return null;
  await db
    .insert(profiles)
    .values({
      id: u.id,
      email: u.email.toLowerCase(),
      name: u.name || "Student",
    })
    .onConflictDoNothing();
  const p = await db.query.profiles.findFirst({ where: eq(profiles.id, u.id) });
  if (!p || p.archived) return null;
  return { ...p, emailVerified: u.emailVerified };
});
export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/auth/sign-in");
  if (!u.emailVerified)
    redirect(`/auth/verify?email=${encodeURIComponent(u.email)}`);
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/students");
  return u;
}
export async function apiUser(admin = false) {
  const u = await getUser();
  if (!u) throw new Error("Please sign in to continue.");
  if (!u.emailVerified)
    throw new Error("Verify your email address before continuing.");
  if (admin && u.role !== "admin") throw new Error("Staff access is required.");
  return u;
}
