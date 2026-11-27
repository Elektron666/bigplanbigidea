"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/magaza", "Teklifler"],
  ["/magaza/urunler", "Ürünler"],
  ["/magaza/ekranlar", "Ekranlar"],
  ["/magaza/musteriler", "Müşteriler"],
  ["/magaza/rapor", "Rapor"],
  ["/magaza/hesap", "Hesap"],
] as const;

export function ShopNav() {
  const path = usePathname();
  return (
    <nav aria-label="Mağaza paneli" className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:order-none md:w-auto">
      {LINKS.map(([href, label]) => {
        const active = href === "/magaza" ? path === "/magaza" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[15px] transition-colors ${active ? "bg-antrasit text-kagit" : "text-antrasit-70 hover:bg-cizgi/60 hover:text-antrasit"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
