import WorkspaceLayout from "@/components/layout/workspace-layout";
import { session } from "@/lib/auth";
import { workspaceSettings } from "@/lib/workspace-settings";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await session();
  if (!s.username || !s.expires || s.expires < Date.now()) redirect("/login");
  return (
    <WorkspaceLayout settings={workspaceSettings(s)}>
      {children}
    </WorkspaceLayout>
  );
}
