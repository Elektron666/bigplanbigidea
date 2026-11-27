"use client";

import { useState } from "react";
import Link from "next/link";

// "Size dönelim" (job 13): name and phone, only with the box ticked by the
// customer (it comes unticked). The text it links to is ORMEN's.
export function LeadForm({ video, shopName }: { video: string; shopName: string }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const res = await fetch("/api/musteri", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ video, name, phone, consent }) }).catch(() => null);
    const out = res ? ((await res.json().catch(() => ({}))) as { error?: string }) : { error: "Bağlantı kurulamadı." };
    setBusy(false);
    setState(res?.ok ? { ok: true, text: `Teşekkürler. ${shopName} sizi arayacak.` } : { ok: false, text: out.error ?? "Gönderilemedi." });
  };
  if (state?.ok) return <p role="status" className="rounded-2xl bg-[#E8EFE6] px-5 py-4 text-[16px] text-[#35523a]">{state.text}</p>;
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-cizgi bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <h2 className="font-display text-[22px]">Size dönelim mi?</h2>
      <p className="text-[14px] text-antrasit-70">İsterseniz adınızı ve telefonunuzu bırakın; yalnızca {shopName} görür.</p>
      <label className="flex flex-col gap-1 text-[14px]">
        Adınız
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" className="h-12 rounded-lg border border-cizgi px-3 text-[16px]" />
      </label>
      <label className="flex flex-col gap-1 text-[14px]">
        Telefonunuz
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={20} className="h-12 rounded-lg border border-cizgi px-3 text-[16px]" />
      </label>
      <label className="flex items-start gap-2 text-[14px]">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 accent-[#2a2a28]" />
        <span>
          Adımın ve telefonumun {shopName} tarafından benimle iletişim için kullanılmasına açık rıza veriyorum.{" "}
          <Link href="/aydinlatma/musteri" className="underline underline-offset-4">
            Aydınlatma metni
          </Link>
        </span>
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-[14px] text-[#9a3b31]">
          {state.text}
        </p>
      )}
      <button type="submit" disabled={busy || !consent} className="h-12 rounded-full bg-antrasit text-[16px] text-kagit disabled:opacity-40">
        Gönder
      </button>
    </form>
  );
}
