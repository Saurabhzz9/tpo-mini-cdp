import Workspace from "@/components/workspace";
import { notFound } from "next/navigation";
export default async function View({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (
    ![
      "overview",
      "subscribers",
      "segments",
      "activity",
      "insights",
      "quality",
      "assistant",
      "lab",
      "settings",
    ].includes(view)
  )
    notFound();
  return <Workspace view={view} />;
}
