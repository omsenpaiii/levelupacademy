import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { mode } = await params;
  if (
    ![
      "sign-in",
      "sign-up",
      "forgot-password",
      "reset-password",
      "verify",
    ].includes(mode)
  )
    notFound();
  return <AuthForm mode={mode} email={(await searchParams).email || ""} />;
}
