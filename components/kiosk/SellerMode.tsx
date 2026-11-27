"use client";

import { useState } from "react";
import type { PriceTable } from "@/lib/satici/fiyat";
import { formatTl } from "@/lib/satici/fiyat";
import type { StockMap } from "@/lib/kumas/stok";
import type { RecentQuote } from "@/lib/teklif/store";

// Seller mode on a showroom screen (Showroom package, job 7): the shop PIN
// opens it, the screen then gets prices, stock and the last 30 days' quotes
// from the server. It closes by itself when nobody touches the screen
// (SELLER_IDLE_MS), and with the visit.

export const SELLER_IDLE_MS = 60_000;

export interface SellerData {
  prices: PriceTable;
  stock: StockMap;
  alternatives: Record<string, string[]>;
  quotes: RecentQuote[];
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"] as const;

export function SellerPinPad({ onUnlock, onClose }: { onUnlock: (d: SellerData) => void; onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const press = (k: string) => {
    setError(null);
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (k && pin.length < 8) setPin((p) => p + k);
  };
  const submit = async () => {
    if (pin.length < 4) return setError("PIN en az 4 haneli.");
    setBusy(true);
    try {
      const res = await fetch("/api/showroom/satici", { method: "POST", body: JSON.stringify({ pin }), headers: { "content-type": "application/json" } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPin("");
        return setError(typeof body.error === "string" ? body.error : "Açılamadı.");
      }
      onUnlock(body as SellerData);
    } catch {
      setError("Bağlantı yok. Satıcı modu internet gerektirir.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="Satıcı modu" className="fixed inset-0 z-50 flex items-center justify-center bg-antrasit/40 p-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-3xl bg-kagit p-6 text-antrasit shadow-xl">
        <h2 className="font-display text-[26px]">Satıcı modu</h2>
        <p className="mt-1 text-[15px] text-antrasit-70">Mağaza PIN&apos;ini girin. Fiyat, stok ve teklif geçmişi görünür; dokunulmazsa 1 dakikada kapanır.</p>
        <p aria-live="polite" className="my-4 h-10 text-center font-display text-[32px] tracking-[0.4em]" data-testid="satici-pin">
          {"•".repeat(pin.length)}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k, i) =>
            k ? (
              <button key={i} type="button" onClick={() => press(k)} disabled={busy} aria-label={k === "⌫" ? "Sil" : k} className="h-14 rounded-2xl border border-cizgi bg-white text-[22px]">
                {k}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[15px] text-[#9a3b31]">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="h-12 flex-1 rounded-full border border-cizgi bg-white text-[16px]">
            Vazgeç
          </button>
          <button type="button" onClick={() => void submit()} disabled={busy} className="h-12 flex-1 rounded-full bg-antrasit text-[16px] text-kagit">
            {busy ? "Açılıyor…" : "Aç"}
          </button>
        </div>
      </div>
    </div>
  );
}

const time = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const date = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

/** The shop's quotes of today and the last 30 days: open one again on the screen, or copy it into a new quote. */
export function QuoteHistory({ quotes, onOpen, onCopy, onClose }: { quotes: RecentQuote[]; onOpen: (q: RecentQuote) => void; onCopy: (q: RecentQuote) => void; onClose: () => void }) {
  const today = dayKey(new Date().toISOString());
  const groups: [string, RecentQuote[]][] = [
    ["Bugün", quotes.filter((q) => dayKey(q.createdAt) === today)],
    ["Son 30 gün", quotes.filter((q) => dayKey(q.createdAt) !== today)],
  ];
  return (
    <div role="dialog" aria-modal="true" aria-label="Teklif geçmişi" className="fixed inset-0 z-50 flex flex-col bg-kirik-beyaz text-antrasit">
      <header className="flex items-center justify-between gap-4 border-b border-cizgi px-6 py-4 sm:px-8">
        <h2 className="font-display text-[28px]">Teklif geçmişi</h2>
        <button type="button" onClick={onClose} className="min-h-12 rounded-full border border-cizgi bg-white px-6 text-[16px]">
          Kapat
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {groups.map(([title, list]) => (
            <section key={title} aria-label={title}>
              <h3 className="eyebrow mb-2">
                {title} · {list.length}
              </h3>
              {list.length === 0 ? (
                <p className="text-[15px] text-antrasit-70">Teklif yok.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {list.map((q) => (
                    <li key={q.number} className="flex flex-wrap items-center gap-3 rounded-2xl border border-cizgi bg-white px-4 py-3" data-testid="gecmis-teklif">
                      <div className="min-w-0 flex-1">
                        <p className="text-[17px]">
                          {q.number} · {title === "Bugün" ? time.format(new Date(q.createdAt)) : date.format(new Date(q.createdAt))}
                        </p>
                        <p className="text-[14px] text-antrasit-70">
                          {q.pieces.map((p) => `${p.modelName} (${p.fabricCode})`).join(", ")}
                          {q.price !== null ? ` · ${formatTl(q.price)}` : ""}
                        </p>
                      </div>
                      <button type="button" onClick={() => onOpen(q)} className="min-h-12 rounded-full border border-cizgi bg-white px-5 text-[15px]" aria-label={`${q.number} yeniden aç`}>
                        Yeniden aç
                      </button>
                      <button type="button" onClick={() => onCopy(q)} className="min-h-12 rounded-full bg-antrasit px-5 text-[15px] text-kagit" aria-label={`${q.number} kopyala`}>
                        Kopyala
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
