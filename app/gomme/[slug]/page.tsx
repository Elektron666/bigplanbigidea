import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCatalogue } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { initialStateFrom } from "@/lib/page-state";
import { getQuotes } from "@/lib/teklif/store";
import { withBuiltSet } from "@/lib/modul/model";
import { pageSets } from "@/lib/modul/store";
import { featureOn, type Feature } from "@/lib/central/features";

// The shop's configurator on its own website (Showroom package, job 16, "Web
// gömme"). Opens only inside the sites the shop allows (proxy.ts sets the
// frame-ancestors from the shop's list). The showroom's own things are off
// here: no lock, no showroom loop, no seller mode, no prices; sample request
// and quote stay on.

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/gomme/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cat = await loadCatalogue(slug);
  return { title: cat?.firm ? `${cat.firm.name} · Kumaşınızı seçin` : "Bulunamadı", robots: { index: false, follow: false } };
}

export default async function EmbedPage({ params, searchParams }: PageProps<"/gomme/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await loadCatalogue(slug);
  if (!cat?.firm || cat.models.length === 0 || cat.fabrics.length === 0) notFound();
  const on = (f: Feature) => featureOn(cat.firm!.features, f);
  const waste = on("teklif") ? await getQuotes().getWaste() : undefined;
  const sets = await pageSets(cat.firm.id);
  const models = withBuiltSet(cat.models, sp.mk, sets);
  return (
    <main data-gomme>
      <h1 className="sr-only">{cat.firm.name}: kumaşınızı koltuğun üstünde görün</h1>
      <Configurator models={models} fabrics={cat.fabrics} firm={cat.firm} {...initialStateFrom(sp, models, cat.fabrics)} waste={waste} moduleSets={on("kose") ? sets : undefined} kartela={false} assistant={on("asistan")} filters={on("filtre")} />
    </main>
  );
}
