import Link from "next/link";
import { requirePermissionPage } from "./guard";
import { getRepository } from "@/lib/data";
import { getProvider } from "@/lib/giydirme/saglayici";
import { getGiydirme } from "@/lib/giydirme/store";
import { GATE, runStats } from "@/lib/giydirme/test-tezgahi";
import { NewTestRun } from "@/components/panel/NewTestRun";
import { Badge, PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Giydirme testi" };

const usd = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 });
const day = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

// The test bench (job 5): before the photo try-on goes to the shops, a set of
// at least 20 sofa photos is run in the chosen fabrics and every picture is
// judged. The field gate: at least 16 of 20 sofas showable.
export default async function TestBenchPage() {
  await requirePermissionPage();
  const [runs, provider, fabrics] = await Promise.all([getGiydirme().listRuns(), getProvider(), getRepository().listFabrics()]);
  return (
    <>
      <PageHeader title="Giydirme testi" eyebrow="Fotoğraftan dene" />
      <p className="mb-5 text-[14px] text-antrasit-70">
        Sahaya çıkma şartı: {GATE.sofas} koltuğun en az {GATE.shown}&apos;sında gösterilebilir sonuç. Bir koltuk, işaretlenen bütün kumaş sonuçları “gösterilebilir” ise geçmiş sayılır.
        {provider?.id === "sahte" && " Şu an deneme sağlayıcısı bağlı: sonuçları gerçek değildir, para harcanmaz."}
      </p>
      {provider ? (
        <NewTestRun fabrics={fabrics.map((f) => ({ code: f.code, name: `${f.code} · ${f.colorName}` }))} />
      ) : (
        <p className="mb-6 rounded-xl bg-cizgi/40 px-4 py-3 text-[14px]">Sağlayıcı bağlı değil; test çalıştırılamaz.</p>
      )}
      <ul className="mt-6 divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit" aria-label="Koşular">
        {runs.length === 0 && <li className="px-5 py-6 text-center text-[14px] text-antrasit-50">Henüz koşu yok.</li>}
        {runs.map((r) => {
          const s = runStats(r.items);
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/panel/giydirme/test/${r.id}`} className="font-medium hover:underline">
                  {r.name}
                </Link>
                <p className="text-[13px] text-antrasit-50">
                  {day.format(new Date(r.createdAt))} · {r.provider} · {r.fabricCodes.join(", ")} · {s.sofas} koltuk, {s.done}/{s.items} görsel · {usd.format(s.costUsd)}
                </p>
              </div>
              {s.gate === "gecti" && <Badge>şart sağlandı</Badge>}
              {s.gate === "kaldi" && <Badge tone="warn">şart sağlanmadı</Badge>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
