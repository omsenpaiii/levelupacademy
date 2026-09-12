import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await requireUser();
  redirect(user.role === "admin" ? "/admin" : "/students");
}
