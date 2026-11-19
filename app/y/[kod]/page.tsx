import type { Metadata } from "next";
import { getGiydirme, SESSION_CODE } from "@/lib/giydirme/store";
import { getRepository } from "@/lib/data";
import { BrandMark } from "@/components/configurator/BrandMark";
import { PhoneUpload } from "./PhoneUpload";

export const metadata: Metadata = { title: "Fotoğraf gönder", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// The phone's side of "Fotoğraftan dene" (job 5): opened by the QR on the
// showroom screen. No account; the session's one-time code is the only key,
// and it takes one photo.
export default async function PhonePhotoPage({ params }: PageProps<"/y/[kod]">) {
  const { kod } = await params;
  const code = decodeURIComponent(kod).toUpperCase();
  const session = SESSION_CODE.test(code) ? await getGiydirme().getSession(code) : null;
  const firm = session ? await getRepository().getFirmById(session.firmId) : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-kirik-beyaz px-5 py-8 text-antrasit">
      {firm ? <BrandMark firm={firm} /> : <BrandMark />}
      {!session ? (
        <>
          <h1 className="font-display text-[28px] leading-tight">Bu kodun süresi doldu</h1>
          <p className="text-[16px] text-antrasit-70">Mağazadaki ekranda “Fotoğraftan dene”ye yeniden dokunun ve yeni kodu okutun.</p>
        </>
      ) : session.phoneUsed ? (
        <>
          <h1 className="font-display text-[28px] leading-tight">Fotoğraf gönderildi</h1>
          <p className="text-[16px] text-antrasit-70">Fotoğrafınız ekranda. Başka bir fotoğraf için ekrandaki yeni kodu okutun.</p>
        </>
      ) : (
        <>
          <h1 className="font-display text-[28px] leading-tight">Koltuğunuzun fotoğrafını gönderin</h1>
          <p className="text-[16px] text-antrasit-70">Koltuğu karşıdan, bütünüyle görünecek şekilde çekin. Fotoğraf birkaç saniyede mağazadaki ekrana düşer.</p>
          <PhoneUpload code={code} />
        </>
      )}
    </main>
  );
}
