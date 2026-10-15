import { session } from "@/lib/auth";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await session();
  if (!s.username || !s.expires || s.expires < Date.now()) redirect("/login");
  return children;
}
