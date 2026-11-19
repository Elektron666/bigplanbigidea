import { notFound } from "next/navigation";
import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { getModuleSets } from "@/lib/modul/store";
import { ModuleSetEditor } from "@/components/panel/ModuleSetEditor";
import { Badge, PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Modül seti" };

export default async function ModuleSetPage({ params, searchParams }: PageProps<"/panel/modul-setleri/[id]">) {
  await requirePanelUser();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [set, firms] = await Promise.all([getModuleSets().getSet(decodeURIComponent(id)), getRepository().listFirms()]);
  if (!set) notFound();
  return (
    <>
      <PageHeader title={set.name} eyebrow="Modül seti">
        {!set.isActive && <Badge tone="off">yayında değil</Badge>}
      </PageHeader>
      {sp.kaydedildi && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {set.name} kaydedildi.
        </p>
      )}
      <ModuleSetEditor key={set.id} set={set} shops={firms.map((f) => ({ id: f.id, name: f.name }))} />
    </>
  );
}
