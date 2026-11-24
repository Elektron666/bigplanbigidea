import { requirePanelUser } from "@/lib/auth/panel";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { FabricEditor } from "@/components/panel/FabricEditor";
import { Badge, PageHeader } from "@/components/panel/ui";
import { FabricLinks } from "@/components/panel/FabricLinks";
import { getFabricExtras } from "@/lib/kumas/store";

export default async function EditFabricPage({ params }: PageProps<"/panel/kumaslar/[id]">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const { id } = await params;
  const repo = getRepository();
  const extras = getFabricExtras();
  const [fabric, models, all, muadil, uyumlu] = await Promise.all([repo.getFabricById(decodeURIComponent(id)), repo.listShowcaseModels(), repo.listFabrics({ includeInactive: true }), extras.listLinks("muadil"), extras.listLinks("uyumlu")]);
  if (!fabric) notFound();
  const code = new Map(all.map((f) => [f.id, f.code]));
  const codes = (ids: string[] | undefined) => (ids ?? []).map((i) => code.get(i)).filter((c): c is string => !!c);
  return (
    <>
      <PageHeader title={fabric.code} eyebrow="Kumaşı düzenle">
        {fabric.isPlaceholder && <Badge tone="warn">yer tutucu görsel</Badge>}
      </PageHeader>
      <FabricEditor key={fabric.id} fabric={fabric} models={models} />
      <section aria-label="Muadil ve uyumlu kumaşlar" className="mt-8 grid max-w-3xl gap-6 border-t border-cizgi pt-6">
        <FabricLinks fabricId={fabric.id} kind="muadil" codes={codes(muadil[fabric.id])} />
        <FabricLinks fabricId={fabric.id} kind="uyumlu" codes={codes(uyumlu[fabric.id])} />
      </section>
    </>
  );
}
