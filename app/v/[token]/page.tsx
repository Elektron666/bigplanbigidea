import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getVideos, VIDEO_TOKEN } from "@/lib/video/store";
import { getLeads } from "@/lib/musteri/store";
import { BrandMark } from "@/components/configurator/BrandMark";
import { LeadForm } from "./LeadForm";

export const metadata: Metadata = { title: "Videonuz", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The customer's phone (job 13): the turning video of what they chose in the
// shop, the quote link from the same visit, and, if they want, their contact
// for the shop. Opened by its long random link only.
export default async function VideoPage({ params }: PageProps<"/v/[token]">) {
  const { token } = await params;
  if (!VIDEO_TOKEN.test(token)) notFound();
  const meta = await getVideos().meta(token);
  if (!meta) notFound();
  const firm = await getRepository().getFirmById(meta.firmId);
  const collects = !!(await getLeads().retention(meta.firmId));
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 bg-kirik-beyaz px-5 py-8 text-antrasit">
      {firm ? <BrandMark firm={firm} /> : <BrandMark />}
      <h1 className="font-display text-[26px] leading-tight">{meta.product || "Seçiminiz"}</h1>
      <video src={`/api/video/${token}`} controls autoPlay muted loop playsInline className="w-full rounded-2xl bg-cizgi/40" data-testid="video" />
      {meta.quoteToken && (
        <a href={`/t/${meta.quoteToken}`} className="flex h-12 items-center justify-center rounded-full border border-cizgi bg-white text-[16px]">
          Teklifinizi açın
        </a>
      )}
      {firm && collects && <LeadForm video={token} shopName={firm.name} />}
      <p className="text-[12px] text-antrasit-50">Ekran renkleri bağlayıcı değildir; renk onayı numuneyle verilir.</p>
    </main>
  );
}
