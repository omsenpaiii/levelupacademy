import { Shell } from "@/components/shell";
import { requireAdmin } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const u = await requireAdmin();
  return (
    <Shell admin user={u}>
      {children}
    </Shell>
  );
}
