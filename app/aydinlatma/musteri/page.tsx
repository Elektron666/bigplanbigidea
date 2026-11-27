import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Aydınlatma metni" };

// The text the consent box links to (job 13). ORMEN gives the text; until then
// this page says so plainly and nothing is pretended.
export default function CustomerNoticePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 bg-kirik-beyaz px-6 py-10 text-antrasit">
      <h1 className="font-display text-[30px] leading-tight">Kişisel verilerin işlenmesine ilişkin aydınlatma metni</h1>
      <p className="rounded-2xl border border-dashed border-cizgi-koyu p-5 text-[16px] text-antrasit-70" data-testid="aydinlatma-yer-tutucu">
        [Yer tutucu] Bu metin ORMEN tarafından verilecek. Metin gelene kadar burada yayınlanacak içerik yoktur.
      </p>
      <p className="text-[14px] text-antrasit-70">
        Genel bilgilendirme için: <Link href="/kvkk" className="underline underline-offset-4">KVKK aydınlatma metni</Link>
      </p>
    </main>
  );
}
