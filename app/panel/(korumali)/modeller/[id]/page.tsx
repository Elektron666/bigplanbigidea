import { requirePanelUser } from "@/lib/auth/panel";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { ModelEditor } from "@/components/panel/ModelEditor";
import { ParametricEditor } from "@/components/panel/ParametricEditor";
import { PageHeader } from "@/components/panel/ui";
import { ModelTags } from "@/components/panel/ModelTags";

export default async function EditModelPage({ params }: PageProps<"/panel/modeller/[id]">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const { id } = await params;
  const repo = getRepository();
  const [models, fabrics] = await Promise.all([repo.listAllModels(), repo.listFabrics()]);
  const model = models.find((m) => m.id === decodeURIComponent(id));
  if (!model) notFound();
  return (
    <>
      <PageHeader title={model.name} eyebrow="Modeli düzenle" />
      <ModelTags key={`etiket-${model.id}`} modelId={model.id} styleTags={model.styleTags ?? []} useTags={model.useTags ?? []} />
      {/* the two built-in samples are code: only their advisor tags can be set */}
      {model.source.kind === "procedural" ? null : model.source.kind === "parametric" ? (
        <ParametricEditor key={model.id} model={model} fabrics={fabrics} />
      ) : (
        <ModelEditor key={model.id} model={model} fabrics={fabrics} />
      )}
    </>
  );
}
