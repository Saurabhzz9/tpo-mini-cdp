import ProfileScreen from "@/components/subscribers/subscriber-profile";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ProfileScreen id={(await params).id} />;
}
