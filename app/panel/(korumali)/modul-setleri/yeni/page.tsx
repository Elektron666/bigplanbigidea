import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { ModuleSetEditor } from "@/components/panel/ModuleSetEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Yeni modül seti" };

export default async function NewModuleSetPage() {
  await requirePanelUser();
  const firms = await getRepository().listFirms();
  return (
    <>
      <PageHeader title="Yeni modül seti" eyebrow="Modül setleri" />
      <ModuleSetEditor shops={firms.map((f) => ({ id: f.id, name: f.name }))} />
    </>
  );
}
