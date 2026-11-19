import { notFound } from "next/navigation";
import { requirePermissionPage } from "../guard";
import { getGiydirme } from "@/lib/giydirme/store";
import { runStats } from "@/lib/giydirme/test-tezgahi";
import { TestRunView } from "@/components/panel/TestRunView";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Giydirme testi" };

export default async function TestRunPage({ params }: PageProps<"/panel/giydirme/test/[id]">) {
  await requirePermissionPage();
  const { id } = await params;
  const run = await getGiydirme().getRun(decodeURIComponent(id));
  if (!run) notFound();
  return (
    <>
      <PageHeader title={run.name} eyebrow="Giydirme testi" />
      <TestRunView run={run} stats={runStats(run.items)} />
    </>
  );
}
