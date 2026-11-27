import type { Metadata, Viewport } from "next";
import { loadCatalogue } from "@/lib/data";
import { currentDevice } from "@/lib/devices/session";
import { appVersion } from "@/lib/devices/app-version";
import { showroomIdleSeconds } from "@/lib/kiosk";
import { initialStateFrom } from "@/lib/page-state";
import { Configurator } from "@/components/configurator/Configurator";
import { BrandMark } from "@/components/configurator/BrandMark";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { PairScreen } from "@/components/kiosk/PairScreen";
import { OfflineAgent } from "@/components/kiosk/OfflineAgent";
import { warmUrls } from "@/lib/offline/warm";
import { getQuotes } from "@/lib/teklif/store";
import { withBuiltSet } from "@/lib/modul/model";
import { pageSets } from "@/lib/modul/store";
import { getProvider } from "@/lib/giydirme/saglayici";
import { featureOn, type Feature } from "@/lib/central/features";
import { ShowroomLock } from "@/components/kiosk/ShowroomLock";
import { SyncAgent } from "@/components/kiosk/SyncAgent";
import { accentStyle } from "@/lib/firm";
import { getFabricExtras, linksByCode, stockByCode } from "@/lib/kumas/store";
import { priceTableFor } from "@/lib/satici/ekran";
import { getSets } from "@/lib/takim/store";
import { screenSet } from "@/lib/takim/takim";
import { clearanceOf } from "@/lib/oda/plan";

// The showroom screen (Showroom package, job 1): one address for every
// shop's screen. Which shop it shows is decided by the screen's own secret,
// set once when the code from the panel is typed.

export const dynamic = "force-dynamic";
// No pinch zoom on the shop floor; the screen is a fixed-size appliance.
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover", themeColor: "#f5f1ea" };

// The tab, the installed app and the splash carry the shop's name only.
export async function generateMetadata(): Promise<Metadata> {
  const who = await currentDevice();
  return {
    title: { absolute: who?.shop.name ?? "Showroom" },
    robots: { index: false, follow: false },
    manifest: "/showroom/manifest.webmanifest",
    icons: who ? { icon: "/showroom/simge/192", apple: "/showroom/simge/192" } : undefined,
    appleWebApp: { capable: true, title: who?.shop.name ?? "Showroom", statusBarStyle: "default" },
  };
}

export default async function ShowroomPage({ searchParams }: PageProps<"/showroom">) {
  const who = await currentDevice();
  if (!who) return <PairScreen />;
  const { shop } = who;
  const version = appVersion();
  const closed = shop.status === "askida" || shop.status === "ayrildi";
  const cat = closed || !shop.isActive ? null : await loadCatalogue(shop.slug);

  // Suspended, or nothing to show yet: a calm notice. Nothing is deleted; the
  // screen keeps checking and carries on by itself when the shop is back.
  if (!cat?.firm || cat.models.length === 0 || cat.fabrics.length === 0) {
    return (
      <main className="flex min-h-dvh select-none flex-col items-center justify-center gap-6 bg-kirik-beyaz px-8 text-center text-antrasit" style={accentStyle(cat?.firm) as React.CSSProperties | undefined}>
        {cat?.firm && <BrandMark firm={cat.firm} />}
        <h1 className="font-display text-[clamp(2rem,4vw,3.5rem)] leading-tight">Ekran kısa bir süre için kapalı</h1>
        <p className="max-w-[40rem] text-[clamp(1.125rem,1.8vw,1.5rem)] text-antrasit-70">Lütfen mağaza görevlisinden yardım isteyin.</p>
        <SyncAgent contentVersion={shop.contentVersion} appVersion={version} alwaysIdle closed={closed} />
        <ShowroomLock contentVersion={shop.contentVersion} appVersion={version} />
      </main>
    );
  }

  const sp = await searchParams;
  const on = (f: Feature) => featureOn(cat.firm!.features, f);
  const waste = on("teklif") ? await getQuotes().getWaste() : undefined;
  const sets = await pageSets(cat.firm.id);
  const models = withBuiltSet(cat.models, sp.mk, sets);
  const moduleSets = on("kose") ? sets : undefined;
  // a half feature is not shown: the button needs the shop's switch and a provider
  const tryOn = on("giydirme") && !!(await getProvider());
  // stock goes to the screen only when the shop shows it (job 8); otherwise not at all
  const extras = on("stok") ? getFabricExtras() : null;
  const [stock, alternatives] = extras ? await Promise.all([extras.listStock().then((s) => stockByCode(s, cat.fabrics)), extras.listLinks("muadil").then((l) => linksByCode(l, cat.fabrics))]) : [undefined, undefined];
  // prices are in the page only when the shop shows them to customers; otherwise only the PIN gets them (job 7)
  // sofa sets and the "uyumlu" fabrics for Kombin (job 6)
  const sofaSets = on("takim") ? (await getSets().forFirm(cat.firm.id)).flatMap((s) => screenSet(s, models) ?? []) : undefined;
  const matches = on("takim") ? linksByCode(await getFabricExtras().listLinks("uyumlu"), cat.fabrics) : undefined;
  const prices = on("musteri-fiyat") ? await priceTableFor(cat.firm.id, models) : undefined;
  const warm = { "1k": warmUrls({ ...cat, moduleSets }, "1k"), "2k": warmUrls({ ...cat, moduleSets }, "2k") };
  return (
    <main data-showroom>
      <h1 className="sr-only">{cat.firm.name}: kumaşınızı koltuğun üstünde görün</h1>
      <KioskShell idleSeconds={showroomIdleSeconds(shop.settings)} firm={cat.firm} showroom>
        <Configurator models={models} fabrics={cat.fabrics} firm={cat.firm} {...initialStateFrom(sp, models, cat.fabrics)} kiosk profileChoice={who.device.quality} waste={waste} showroom={on("siparis")} moduleSets={moduleSets} kartela={on("kartela")} tryOn={tryOn} assistant={on("asistan")} filters={on("filtre")} stock={stock} alternatives={alternatives} seller={on("satici")} prices={prices} sets={sofaSets} matches={matches} clearanceCm={clearanceOf(shop.settings)} />
        <SyncAgent contentVersion={shop.contentVersion} appVersion={version} />
      </KioskShell>
      <ShowroomLock contentVersion={shop.contentVersion} appVersion={version} />
      <OfflineAgent warm={warm} />
    </main>
  );
}
