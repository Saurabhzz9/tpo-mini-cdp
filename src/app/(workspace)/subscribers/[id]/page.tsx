import Workspace from "@/components/workspace";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <Workspace view="profile" profileId={(await params).id} />;
}
