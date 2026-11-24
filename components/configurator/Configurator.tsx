"use client";

import dynamic from "next/dynamic";
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import { preferredTextureSize } from "@/lib/three/texture-size";
import { t } from "@/lib/i18n/tr";
import { CopyCodeButton, FabricHeadline, FabricSpecs, FabricStock } from "./FabricInfo";
import { alternativesFor } from "@/lib/kumas/muadil";
import type { StockMap } from "@/lib/kumas/stok";
import { QuickStrip } from "./QuickStrip";
import { PresetStrip } from "./PresetStrip";
import { useOnline } from "@/lib/offline/use-online";
import type { ProfileChoice } from "@/lib/three/profile";
import type { WasteSettings } from "@/lib/teklif/metraj";
import { decodeArrangement, type Arrangement, type ModuleSet } from "@/lib/modul/dizilim";
import { builtModel, KURULUM_SLUG } from "@/lib/modul/model";
import { CornerBuilder } from "./CornerBuilder";
import { KartelaScanner } from "@/components/kiosk/KartelaScanner";
import { PhotoTryOn } from "@/components/kiosk/PhotoTryOn";
import { Asistan } from "@/components/kiosk/Asistan";
import { KioskCodeEntry } from "@/components/kiosk/KioskCodeEntry";
import { AttractContext } from "@/components/kiosk/attract";
import { ATTRACT_STEP_SECONDS, attractChangesModel, attractFabrics, attractModels, nextAttract, nextAttractModel } from "@/lib/kiosk";
import { MeasurePanel } from "./MeasurePanel";
import { ZonePicker } from "./ZonePicker";
import { DEFAULT_LEG, hasWoodLegs } from "@/lib/three/legs";
import { cleanZones, fabricParts, pieceCodes, zoneCode, zoneFabricsOf, type Zone } from "@/lib/three/zones";
import { useMedia } from "@/lib/use-media";
import { FabricPicker } from "./FabricPicker";
import { BrandMark } from "./BrandMark";
import { CompareDivider, SceneTools } from "./SceneTools";
import { useFavorites } from "@/lib/favorites";
import { IconAr, IconClose, IconHeart, IconShare } from "@/components/ui/icons";
import { DEFAULT_PRESET, encodeRoom, matchingPreset, type RoomPreset, type RoomSpec } from "@/lib/room/spec";
import { constrain, encodeLayout, findFreeSpot, modelDims, newId, overlapping, type Dims, type Placement } from "@/lib/room/layout";
import type { StageApi } from "@/components/three/Stage";
import { encodeShare } from "@/lib/share";
import { shortenShare } from "@/lib/share-client";
import { accentStyle } from "@/lib/firm";
import { composeShareImage, groupByFabric } from "@/lib/share-image";
import { arPath } from "@/lib/ar/device";
import { track } from "@/lib/track";
import { fabricsForModel, seriesOf, startFabric } from "@/lib/fabric/allowed";
import type { PrintData } from "./PrintSheet";

const Stage = dynamic(() => import("@/components/three/Stage").then((m) => m.Stage), {
  ssr: false,
  loading: () => null,
});
// Dialogs, the offer sheet and the room panel: their code is fetched the first time they
// open, not with the page (gece toplantısı, 12 Oct: less JavaScript before the first view)
const QuoteDialog = dynamic(() => import("./QuoteDialog").then((m) => m.QuoteDialog), { ssr: false, loading: () => null });
const SampleDialog = dynamic(() => import("./SampleDialog").then((m) => m.SampleDialog), { ssr: false, loading: () => null });
const ShareDialog = dynamic(() => import("./ShareDialog").then((m) => m.ShareDialog), { ssr: false, loading: () => null });
const PrintSheet = dynamic(() => import("./PrintSheet").then((m) => m.PrintSheet), { ssr: false, loading: () => null });
const QrDialog = dynamic(() => import("@/components/ui/QrDialog").then((m) => m.QrDialog), { ssr: false, loading: () => null });
const ArDialog = dynamic(() => import("./ArDialog").then((m) => m.ArDialog), { ssr: false, loading: () => null });
const FeedbackDialog = dynamic(() => import("./FeedbackDialog").then((m) => m.FeedbackDialog), { ssr: false, loading: () => null });
const TrueScaleDialog = dynamic(() => import("./TrueScaleDialog").then((m) => m.TrueScaleDialog), { ssr: false, loading: () => null });
const ModelSwapDialog = dynamic(() => import("./ModelSwapDialog").then((m) => m.ModelSwapDialog), { ssr: false, loading: () => null });
const RoomPanel = dynamic(() => import("./RoomPanel").then((m) => m.RoomPanel), { ssr: false, loading: () => null });

/** True from the first time `on` is true: a lazily loaded part stays mounted (and keeps its state) after that. */
function useOnceOn(on: boolean): boolean {
  const [was, setWas] = useState(on);
  if (on && !was) setWas(true);
  return was || on;
}

export interface ConfiguratorProps {
  models: FurnitureModel[];
  initialModelSlug: string;
  fabrics: Fabric[];
  initialFabricCode?: string;
  initialRoom?: RoomSpec | null;
  /** Pieces from a shared link; when absent one piece of initialModelSlug is placed. */
  initialLayout?: Placement[] | null;
  initialPlan?: boolean;
  firm?: Firm | null;
  /** Showroom kiosk: sharing becomes a QR the visitor scans to take the combination home. */
  kiosk?: boolean;
  /** Paired showroom screen: its quality profile as set in the panel (lib/three/profile.ts). */
  profileChoice?: ProfileChoice;
  /** ORMEN's waste settings: given on a shop's page, they turn on "Metraj ve teklif" (job 3). */
  waste?: WasteSettings;
  /** A paired shop screen: the quote can be sent to ORMEN as a fabric order request. */
  showroom?: boolean;
  /** The module set the "Köşe kur" tab builds with (job 4); none = no tab. */
  /** The corner set builder's module sets (job 4): the shop's own first; none = no builder. */
  moduleSets?: ModuleSet[];
  /** "Fotoğraftan dene" (job 5): a paired showroom screen whose shop has it on, while a provider is set. */
  tryOn?: boolean;
  /** The assistant and sofa advisor (job 10): on unless the shop switched it off. */
  assistant?: boolean;
  /** "Kartela okut" on the kiosk (job 2); a shop may switch it off. */
  kartela?: boolean;
  /** The customer's filters in the fabric list (job 8); a shop may switch them off. */
  filters?: boolean;
  /** Stock by fabric code (job 8): given only to a screen whose shop shows stock. */
  stock?: StockMap;
  /** ORMEN's alternatives by fabric code (job 8), shown when a fabric is out of stock. */
  alternatives?: Record<string, string[]>;
}

type Tab = "kumas" | "oda" | "kose";
type Slot = "sol" | "sag";
interface CompareState {
  right: Fabric;
  active: Slot;
}

function setQuery(params: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  window.history.replaceState(window.history.state, "", url);
}

export function Configurator({
  models: catalogueModels,
  initialModelSlug,
  fabrics,
  initialFabricCode,
  initialRoom,
  initialLayout,
  initialPlan = false,
  firm,
  kiosk = false,
  profileChoice,
  waste,
  showroom = false,
  moduleSets,
  kartela = true,
  tryOn = false,
  assistant = false,
  filters = true,
  stock,
  alternatives,
}: ConfiguratorProps) {
  // ---------------------------------------------------------------- corner set builder (job 4)
  // the set being built is one more model, at the fixed address "kose-kurucu"
  const [built, setBuilt] = useState<FurnitureModel | null>(() => catalogueModels.find((m) => m.slug === KURULUM_SLUG) ?? null);
  const models = useMemo(() => (built ? [...catalogueModels.filter((m) => m.slug !== KURULUM_SLUG), built] : catalogueModels.filter((m) => m.slug !== KURULUM_SLUG)), [catalogueModels, built]);
  const [arrangement, setArrangement] = useState<Arrangement>(() => decodeArrangement(built?.kurulum)?.arrangement ?? { ids: [], mirrored: false });
  // the set being built from: the one in the link, else the shop's first
  const [setSlug, setSetSlug] = useState(() => decodeArrangement(built?.kurulum)?.setSlug ?? moduleSets?.[0]?.slug);
  const moduleSet = moduleSets?.find((s) => s.slug === setSlug) ?? moduleSets?.[0];
  const changeSet = (slug: string) => {
    // another set has other modules: start again
    setSetSlug(slug);
    setArrangement({ ids: [], mirrored: false });
    setBuildError(null);
  };
  const [buildError, setBuildError] = useState<string | null>(null);
  const byCode = useMemo(() => new Map(fabrics.map((f) => [f.code, f])), [fabrics]);
  const bySlug = useMemo(() => new Map(models.map((m) => [m.slug, m])), [models]);
  const dimsOf = useCallback((slug: string): Dims => {
    const m = bySlug.get(slug);
    return m ? modelDims(m) : { w: 100, d: 100 };
  }, [bySlug]);

  const [room, setRoom] = useState<RoomSpec>(() => initialRoom ?? { ...DEFAULT_PRESET.spec });

  // ---------------------------------------------------------------- layout
  const [items, setItems] = useState<Placement[]>(() => {
    if (initialLayout?.length) return initialLayout.map((p) => constrain(p, dimsOf(p.modelSlug), initialRoom ?? DEFAULT_PRESET.spec));
    const model = bySlug.get(initialModelSlug) ?? models[0];
    const fabricCode = (byCode.get(initialFabricCode ?? "") ?? byCode.get(model.defaultFabricCode ?? "") ?? fabrics[0]).code;
    const spot = findFreeSpot(model.dimensionsCm, initialRoom ?? DEFAULT_PRESET.spec, []);
    return [{ id: newId(), modelSlug: model.slug, fabricCode, ...spot }];
  });
  const [selectedId, setSelectedId] = useState(() => items[0].id);
  const selectedItem = items.find((p) => p.id === selectedId) ?? items[0];
  const selectedModel = bySlug.get(selectedItem.modelSlug) ?? models[0];
  const selected = byCode.get(selectedItem.fabricCode) ?? fabrics[0];
  // a zone (arms, cushions…) takes its own fabric; null = the whole piece
  const [zone, setZone] = useState<Zone | null>(null);
  const zonable = (bySlug.get(selectedItem.modelSlug) ?? models[0]).source.kind !== "glb";
  const activeZone = zonable ? zone : null;
  const active = byCode.get(zoneCode(selectedItem, activeZone)) ?? selected;
  const overlapIds = useMemo(() => overlapping(items.map((p) => ({ p, dims: dimsOf(p.modelSlug) }))), [items, dimsOf]);

  // write the layout to the link, debounced (browsers limit history updates)
  const urlTimer = useRef<number | undefined>(undefined);
  const commit = useCallback((next: Placement[]) => {
    setItems(next);
    window.clearTimeout(urlTimer.current);
    urlTimer.current = window.setTimeout(() => setQuery({ y: encodeLayout(next), m: null, k: null }), 350);
  }, []);

  // a valid set goes on the selected piece at once (3D, sizes, metres); an invalid one keeps the last good set
  const changeArrangement = (a: Arrangement) => {
    setArrangement(a);
    if (!moduleSet || !a.ids.length) return setBuildError(null);
    const r = builtModel(moduleSet, a);
    if (!r.ok) return setBuildError(r.error);
    setBuildError(null);
    setBuilt(r.model);
    const dims = modelDims(r.model);
    commit(items.map((p) => (p.id === selectedItem.id ? constrain({ ...p, modelSlug: KURULUM_SLUG, zones: undefined }, dims, room) : p)));
    setQuery({ mk: r.model.kurulum ?? null });
  };

  const [shownCodes, setShownCodes] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const loading = shownCodes[selectedItem.id] !== selected.code;

  const [tab, setTab] = useState<Tab>("kumas");
  const [ambient, setAmbient] = useState(() => (initialRoom ? matchingPreset(initialRoom) ?? DEFAULT_PRESET : DEFAULT_PRESET).ambient);

  const changeRoom = useCallback(
    (spec: RoomSpec, preset?: RoomPreset) => {
      setRoom(spec);
      if (preset) setAmbient(preset.ambient);
      track("oda_degisti", { firmSlug: firm?.slug });
      setQuery({ oda: matchingPreset(spec)?.id ?? encodeRoom(spec) });
      // keep every piece inside the new walls
      commit(items.map((p) => constrain(p, dimsOf(p.modelSlug), spec)));
    },
    [commit, items, dimsOf, firm],
  );

  const [closeUp, setCloseUp] = useState(false);
  const [plan, setPlan] = useState(initialPlan);
  const [fading, setFading] = useState(false);

  // 3D ⇄ plan: a short fade hides the camera swap
  const togglePlan = () => {
    setFading(true);
    window.setTimeout(() => {
      const next = !plan;
      setPlan(next);
      if (next) track("plan_acildi", { firmSlug: firm?.slug });
      setQuery({ g: next ? "plan" : "3b" });
      setCloseUp(false);
      window.setTimeout(() => setFading(false), 60);
    }, 160);
  };
  const [showDims, setShowDims] = useState(false);
  const [compare, setCompare] = useState<CompareState | null>(null);
  const [split, setSplit] = useState(0.5);
  const favorites = useFavorites();

  const onKartela = useCallback((f: Fabric) => void track("kartela_okutuldu", { firmSlug: firm?.slug, fabricCode: f.code }), [firm?.slug]);
  const select = useCallback(
    (f: Fabric) => {
      if (compare?.active === "sag") {
        setCompare({ ...compare, right: f });
        return;
      }
      commit(
        items.map((p) => {
          if (p.id !== selectedItem.id) return p;
          // the whole piece: one fabric again; a zone: only that zone changes
          if (!activeZone) return { ...p, fabricCode: f.code, zones: undefined };
          return { ...p, zones: cleanZones(p.fabricCode, { ...p.zones, [activeZone]: f.code }) };
        }),
      );
      track("kumas_denendi", { firmSlug: firm?.slug, modelSlug: selectedItem.modelSlug, fabricCode: f.code });
    },
    [compare, commit, items, selectedItem.id, selectedItem.modelSlug, firm, activeZone],
  );

  // fabrics offered on the selected piece's model (a model can be limited to some series)
  const modelFabrics = useMemo(() => fabricsForModel(fabrics, selectedModel), [fabrics, selectedModel]);
  // kiosk welcome screen: turn slowly and wear the real fabrics in turn; not a
  // visitor's choice, so neither tracked nor written to the address
  const attract = useContext(AttractContext) && kiosk;
  // the turn is motion; the fabric change alone is kept for those who ask for less
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const attractList = useMemo(() => attractFabrics(modelFabrics), [modelFabrics]);
  // the next fabric 6 s after this one is on screen, so a slow tablet never shows a half-loaded swap
  // every third step a single sofa makes way for the shop's next model (task section 4)
  const loopModels = useMemo(() => attractModels(models), [models]);
  const loopStep = useRef(0);
  useEffect(() => {
    if (!attract || !attractList.length || loading) return;
    const t = window.setTimeout(() => {
      loopStep.current += 1;
      const step = loopStep.current;
      setItems((prev) => {
        const piece = prev[0];
        if (prev.length === 1 && piece && attractChangesModel(step, loopModels.length)) {
          const model = nextAttractModel(loopModels, piece.modelSlug);
          const offered = model ? attractFabrics(fabricsForModel(fabrics, model)) : [];
          if (model && offered.length) {
            const fabric = offered.find((f) => f.code === piece.fabricCode) ?? offered[0];
            return [{ ...piece, modelSlug: model.slug, fabricCode: fabric.code, zones: undefined }];
          }
        }
        const next = nextAttract(attractList, piece?.fabricCode ?? "");
        return next ? prev.map((p) => ({ ...p, fabricCode: next.code, zones: undefined })) : prev;
      });
    }, ATTRACT_STEP_SECONDS * 1000);
    return () => window.clearTimeout(t);
  }, [attract, attractList, loading, selected.code, loopModels, fabrics]);
  // phones: the piece toolbar (turn, duplicate) waits until a piece is tapped,
  // so the first screen is the sofa and its fabrics, not tools
  const phone = useMedia("(max-width: 767px)");
  const [pieceTapped, setPieceTapped] = useState(false);
  const allowedOn = (slug: string) => {
    const m = bySlug.get(slug);
    return m ? fabricsForModel(fabrics, m) : fabrics;
  };
  // only pieces whose model offers this fabric take it
  // copies the selected piece's whole dressing: main fabric, zone fabrics, leg finish
  const applyToAll = () =>
    commit(
      items.map((p) => {
        const allowed = allowedOn(p.modelSlug);
        if (!allowed.some((f) => f.code === selected.code)) return p;
        const zones = selectedItem.zones && Object.fromEntries(Object.entries(selectedItem.zones).filter(([, c]) => allowed.some((f) => f.code === c)));
        return { ...p, fabricCode: selected.code, zones: zones && Object.keys(zones).length ? zones : undefined, ayak: selectedItem.ayak, yon: selectedItem.yon };
      }),
    );

  // ---------------------------------------------------------------- piece actions
  const addPiece = (slug: string) => {
    const model = bySlug.get(slug);
    if (!model) return;
    const spot = findFreeSpot(modelDims(model), room, items.map((p) => ({ p, dims: dimsOf(p.modelSlug) })));
    const piece: Placement = { id: newId(), modelSlug: slug, fabricCode: startFabric(fabricsForModel(fabrics, model), selected.code, model).code, ...spot };
    commit([...items, piece]);
    setSelectedId(piece.id);
  };
  /** Another model in a piece's place: position, fabric, zones, legs and pattern direction stay where they still apply. */
  // `fabricCode`: the assistant's suggestion puts a model and its fabric on the piece in one step
  const swapModel = (id: string, slug: string, fabricCode?: string) => {
    const model = bySlug.get(slug);
    const src = items.find((p) => p.id === id);
    if (!model || !src) return;
    const allowed = fabricsForModel(fabrics, model);
    const keep = (code: string) => allowed.some((f) => f.code === code);
    if (src.modelSlug === slug) {
      if (fabricCode && keep(fabricCode)) commit(items.map((p) => (p.id === id ? { ...p, fabricCode, zones: undefined } : p)));
      return;
    }
    const zones = !fabricCode && src.zones && Object.fromEntries(Object.entries(src.zones).filter(([, c]) => keep(c)));
    let next: Placement = {
      ...src,
      modelSlug: slug,
      fabricCode: fabricCode && keep(fabricCode) ? fabricCode : keep(src.fabricCode) ? src.fabricCode : startFabric(allowed, src.fabricCode, model).code,
      zones: zones && Object.keys(zones).length ? zones : undefined,
      ayak: hasWoodLegs(model) ? src.ayak : undefined,
    };
    next = constrain(next, modelDims(model), room);
    const others = items.filter((p) => p.id !== id).map((p) => ({ p, dims: dimsOf(p.modelSlug) }));
    // a bigger model that now runs into another piece moves to the nearest free spot
    if (overlapping([...others, { p: next, dims: modelDims(model) }]).has(id)) next = { ...next, ...findFreeSpot(modelDims(model), room, others) };
    commit(items.map((p) => (p.id === id ? next : p)));
    setSelectedId(id);
  };

  const pieceActions = {
    onChangeModel: kiosk ? undefined : (id: string) => setSwapFor(id),
    onSelect: (id: string) => {
      setSelectedId(id);
      setPieceTapped(true);
    },
    onMove: (id: string, x: number, z: number) =>
      setItems((list) => list.map((p) => (p.id === id ? constrain({ ...p, x, z }, dimsOf(p.modelSlug), room) : p))),
    onDragEnd: () => commit(items),
    onRotate: (id: string, deg: number) =>
      commit(items.map((p) => (p.id === id ? constrain({ ...p, rot: p.rot + deg }, dimsOf(p.modelSlug), room) : p))),
    onDuplicate: (id: string) => {
      const src = items.find((p) => p.id === id);
      if (!src) return;
      const spot = findFreeSpot(dimsOf(src.modelSlug), room, items.map((p) => ({ p, dims: dimsOf(p.modelSlug) })));
      const copy: Placement = { ...src, id: newId(), ...spot };
      commit([...items, copy]);
      setSelectedId(copy.id);
    },
    onDelete: (id: string) => {
      if (items.length < 2) return;
      const next = items.filter((p) => p.id !== id);
      commit(next);
      if (id === selectedId) setSelectedId(next[0].id);
    },
  };

  const toggleCompare = () => {
    if (compare) {
      setCompare(null);
      return;
    }
    // start with a fabric from another series so the difference is obvious
    const other = modelFabrics.find((f) => f.series !== selected.series) ?? modelFabrics.find((f) => f.code !== selected.code) ?? selected;
    setCompare({ right: other, active: "sag" });
    setSplit(0.5);
    setTab("kumas");
  };

  const shownFabric = compare?.active === "sag" ? compare.right : active;

  // a fabric the visitor is about to pick starts loading; the loader (and three.js) comes with the scene anyway
  const intent = useCallback((f: Fabric) => {
    void import("@/lib/three/fabric-material").then((m) => m.prefetchFabric(f, preferredTextureSize()));
  }, []);

  // ---------------------------------------------------------------- share, sample, print
  const stageApi = useRef<StageApi | null>(null);
  const onStageApi = useCallback((api: StageApi) => {
    stageApi.current = api;
  }, []);
  const online = useOnline();
  const [sampleOpen, setSampleOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [tryOnOpen, setTryOnOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [share, setShare] = useState<{ image: Blob | null; snapshot: string; url: string } | null>(null);
  const [printing, setPrinting] = useState<PrintData | null>(null);

  const shareId = useCallback(
    () => encodeShare({ y: encodeLayout(items), oda: matchingPreset(room)?.id ?? encodeRoom(room), g: plan ? "plan" : undefined, f: firm?.slug, mk: items.some((p) => p.modelSlug === KURULUM_SLUG) ? built?.kurulum : undefined }),
    [items, room, plan, firm, built],
  );
  const shareUrl = useCallback(() => `${window.location.origin}/p/${shareId()}`, [shareId]);

  useEffect(() => {
    track("sayfa_acildi", { firmSlug: firm?.slug });
  }, [firm?.slug]);

  // AR: the selected piece in its fabric
  const [arOpen, setArOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [trueScaleOpen, setTrueScaleOpen] = useState(false);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const selectedIndex = Math.max(0, items.findIndex((p) => p.id === selectedItem.id));
  const arUrl = useCallback(() => `${window.location.origin}${arPath(shareId(), selectedIndex)}`, [shareId, selectedIndex]);

  const piecesForShare = () =>
    items.flatMap((p) => {
      const model = bySlug.get(p.modelSlug);
      const fabric = byCode.get(p.fabricCode);
      return model && fabric ? [{ p, model, fabric, dims: modelDims(model), modelName: model.name, parts: fabricParts(fabric, p.zones, byCode) }] : [];
    });
  const shareText = () =>
    "ORMEN kumaşlarıyla hazırladığım kombinasyon: " +
    groupByFabric(piecesForShare())
      .map((g) => `${g.fabric.code} (${g.models.join(", ")})`)
      .join(", ");

  const [takeHome, setTakeHome] = useState<string | null>(null);
  const openShare = async () => {
    track("paylasildi", { firmSlug: firm?.slug, modelSlug: selectedItem.modelSlug, fabricCode: selected.code });
    const id = shareId();
    const longUrl = `${window.location.origin}/p/${id}`;
    // the long link works at once; the short one replaces it when it arrives
    const short = shortenShare(id);
    if (kiosk) {
      setTakeHome(longUrl);
      const s = await short;
      if (s) setTakeHome((cur) => (cur === longUrl ? s : cur));
      return;
    }
    const snapshot = stageApi.current?.snapshot() ?? "";
    setShare({ image: null, snapshot, url: longUrl });
    short.then((s) => s && setShare((cur) => (cur && cur.url === longUrl ? { ...cur, url: s } : cur)));
    try {
      const image = await composeShareImage(snapshot, piecesForShare(), firm);
      setShare((cur) => (cur ? { ...cur, image } : cur));
    } catch {
      setShare(null);
    }
  };

  const layoutFabrics = (() => {
    const list = [selected, ...items.flatMap((p) => pieceCodes(p).map((c) => byCode.get(c))).filter((f): f is Fabric => !!f)];
    const seen = new Set<string>();
    return list.filter((f) => (seen.has(f.code) ? false : (seen.add(f.code), true)));
  })();
  const whatsappNumber = firm?.whatsapp ?? process.env.NEXT_PUBLIC_ORMEN_WHATSAPP ?? null;

  const onFabricShown = useCallback((id: string, code: string, first: boolean) => {
    setShownCodes((m) => ({ ...m, [id]: code }));
    if (first) setReady(true);
  }, []);

  const style = accentStyle(firm) as React.CSSProperties | undefined;
  const roomTabUsed = useOnceOn(tab === "oda");
  const swapUsed = useOnceOn(swapFor !== null);
  const trueScaleUsed = useOnceOn(trueScaleOpen);
  const feedbackUsed = useOnceOn(feedbackOpen);

  return (
    <div style={style} className="kiosk-grid relative h-dvh w-full overflow-hidden bg-kirik-beyaz md:grid md:grid-cols-[minmax(0,1fr)_380px] lg:grid-cols-[minmax(0,1fr)_420px]">
      <MeasurePanel />
      {/* ---------------------------------------------------------------- scene */}
      <section className="studio-backdrop relative h-[60dvh] md:h-dvh" aria-label="3B sahne">
        <div className={`absolute inset-0 transition-opacity duration-150 ${fading ? "opacity-0" : "opacity-100"}`}>
          <Stage
            profileChoice={profileChoice}
            spin={attract && !reducedMotion}
            models={bySlug}
            fabrics={byCode}
            items={items}
            selectedId={selectedItem.id}
            overlapIds={overlapIds}
            actions={pieceActions}
            pieceToolbar={!kiosk && (!phone || pieceTapped || items.length > 1)}
            room={room}
            onApi={onStageApi}
            ambient={ambient}
            compareFabric={compare?.right ?? null}
            split={split}
            closeUp={closeUp}
            showDimensions={showDims || tab === "kose"}
            plan={plan}
            onFabricShown={onFabricShown}
            onError={() => setFailed(true)}
          />
        </div>

        <header className="kiosk-zoom pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-7">
          <div
            className={`pointer-events-auto rounded-xl transition-colors duration-300 ${room.shape !== "yok" ? "-m-2.5 bg-kagit/85 p-2.5 backdrop-blur-[2px]" : ""}`}
          >
            <BrandMark firm={firm} />
          </div>
          {ready && (
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setArOpen(true)}
                className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border border-cizgi bg-kagit/90 px-3 text-[13px] text-antrasit backdrop-blur-[2px] transition-colors hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit sm:px-4"
              >
                <IconAr width={17} height={17} />
                {/* icon-only on small phones so "Numune iste" always fits */}
                <span className="max-sm:sr-only">Odamda gör</span>
              </button>
              <button
                type="button"
                onClick={openShare}
                className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border border-cizgi bg-kagit/90 px-3 text-[13px] text-antrasit backdrop-blur-[2px] transition-colors hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit sm:px-4"
              >
                <IconShare width={17} height={17} className="sm:hidden" />
                <span className="max-sm:sr-only">{kiosk ? "Telefona al" : "Paylaş"}</span>
              </button>
              {assistant && (
                <button
                  type="button"
                  onClick={() => setAssistantOpen(true)}
                  className="flex h-10 items-center whitespace-nowrap rounded-full border border-cizgi bg-kagit/90 px-3 text-[13px] text-antrasit backdrop-blur-[2px] transition-colors hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit sm:px-4"
                >
                  Asistan
                </button>
              )}
              {tryOn && (
                <button
                  type="button"
                  onClick={() => setTryOnOpen(true)}
                  className="flex h-10 items-center whitespace-nowrap rounded-full border border-cizgi bg-kagit/90 px-3 text-[13px] text-antrasit backdrop-blur-[2px] transition-colors hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit sm:px-4"
                >
                  Fotoğraftan dene
                </button>
              )}
              {waste && (
                <button
                  type="button"
                  onClick={() => setQuoteOpen(true)}
                  className="flex h-10 items-center whitespace-nowrap rounded-full border border-cizgi bg-kagit/90 px-3 text-[13px] text-antrasit backdrop-blur-[2px] transition-colors hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit sm:px-4"
                >
                  Metraj ve teklif
                </button>
              )}
              <button
                type="button"
                onClick={() => setSampleOpen(true)}
                // a showroom screen without internet cannot send a request; it says why instead of failing
                disabled={kiosk && !online}
                title={kiosk && !online ? "İnternet bağlantısı gelince açılır" : undefined}
                className={`h-10 whitespace-nowrap rounded-full px-4 text-[13px] transition-[color,background-color,filter] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-antrasit disabled:opacity-50 ${
                  firm ? "bg-accent text-accent-ink hover:brightness-110" : "bg-antrasit text-kagit hover:bg-ceviz"
                }`}
              >
                Numune iste
                {kiosk && !online && <span className="sr-only"> (internet bağlantısı gelince açılır)</span>}
              </button>
            </div>
          )}
        </header>

        {compare && ready && (
          <CompareDivider split={split} onSplit={setSplit} leftCode={selected.code} rightCode={compare.right.code} />
        )}

        {ready && (
          <div className="kiosk-zoom-wide pointer-events-none absolute inset-x-0 bottom-[calc(2dvh+3.75rem)] flex justify-center px-4 md:bottom-12">
            <div className="pointer-events-auto">
              <SceneTools
                models={models}
                onAdd={addPiece}
                plan={plan}
                onPlan={togglePlan}
                closeUp={closeUp}
                onCloseUp={() => setCloseUp((v) => !v)}
                dimensions={showDims}
                onDimensions={() => setShowDims((v) => !v)}
                comparing={Boolean(compare)}
                onCompare={toggleCompare}
                kiosk={kiosk}
              />
            </div>
          </div>
        )}

        {/* first paint: a quiet placeholder, never a grey sofa */}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`}
          aria-hidden={ready}
        >
          {failed ? (
            <p className="max-w-xs text-center text-sm text-antrasit-70">Sahne yüklenemedi. Bağlantınızı kontrol edip sayfayı yenileyin.</p>
          ) : (
            <>
              <span className="relative block h-px w-24 overflow-hidden bg-cizgi">
                <span className="absolute inset-y-0 left-0 w-1/3 animate-[loadbar_1.2s_ease-in-out_infinite] bg-antrasit-50" />
              </span>
              <span className="eyebrow">{t.loadingFabric}</span>
            </>
          )}
        </div>

        {/* on a phone: one block under the scene tools, the feedback link flowing on the same lines */}
        <p className="kiosk-zoom pointer-events-none absolute inset-x-0 bottom-[calc(2dvh+0.5rem)] px-6 text-center md:bottom-4">
          <span
            className={`rounded-full text-[11px] leading-snug transition-colors duration-300 ${
              room.shape !== "yok" ? "bg-kagit/85 px-3 py-1 text-antrasit-70" : "text-antrasit-50"
            }`}
          >
            {t.colorDisclaimer}
            {!kiosk && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="pointer-events-auto whitespace-nowrap px-1 py-1 text-antrasit-50 underline underline-offset-2 hover:text-antrasit"
                >
                  Bize fikir verin
                </button>
              </>
            )}
          </span>
        </p>
      </section>

      {/* ---------------------------------------------------------------- panel */}
      <FabricSheet
        header={
          <>
            {kiosk && (
              <div className="mb-5">
                <KioskCodeEntry fabrics={modelFabrics} selectedCode={active.code} onSelect={select} />
                {kartela && <KartelaScanner fabrics={modelFabrics} onSelect={select} onScanned={onKartela} />}
              </div>
            )}
            <div className="flex items-start justify-between gap-3">
              <FabricHeadline fabric={shownFabric} loading={loading && ready && shownFabric === active} />
              {/* the visitor is waiting for the sofa: the kiosk's idle count holds (for a while; lib/kiosk.ts) */}
              {loading && <span hidden data-yukleniyor="" />}
              <div className="-mr-2 mt-3 flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => favorites.toggle(shownFabric.code)}
                  aria-pressed={favorites.has(shownFabric.code)}
                  aria-label={favorites.has(shownFabric.code) ? `${shownFabric.code} beğendiklerimden çıkar` : `${shownFabric.code} beğendiklerime ekle`}
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-cizgi/60 focus-visible:outline-2 focus-visible:outline-antrasit ${
                    favorites.has(shownFabric.code) ? "text-accent" : "text-antrasit-70"
                  }`}
                >
                  <IconHeart width={19} height={19} filled={favorites.has(shownFabric.code)} />
                </button>
                <CopyCodeButton code={shownFabric.code} />
              </div>
            </div>
            {phone && <QuickStrip fabrics={modelFabrics} selectedCode={active.code} onSelect={select} />}
            <div role="tablist" aria-label="Panel" className={`mt-4 grid border-b border-cizgi ${moduleSet ? "grid-cols-3" : "grid-cols-2"}`}>
              {(
                [
                  ["kumas", "Kumaş"],
                  ...(moduleSet ? ([["kose", "Köşe kur"]] as const) : []),
                  ["oda", "Oda"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`sekme-${id}`}
                  aria-selected={tab === id}
                  aria-controls={`bolum-${id}`}
                  onClick={() => setTab(id)}
                  className={`-mb-px h-11 border-b-2 text-[14px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-antrasit ${
                    tab === id ? "border-antrasit text-antrasit" : "border-transparent text-antrasit-50 hover:text-antrasit"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        }
      >
        <div id="bolum-kumas" role="tabpanel" aria-labelledby="sekme-kumas" hidden={tab !== "kumas"}>
          <PresetStrip presets={firm?.presets ?? []} fabrics={byCode} />
          {zonable && !compare && (
            <ZonePicker
              piece={selectedItem}
              fabrics={byCode}
              zone={activeZone}
              onZone={setZone}
              legs={hasWoodLegs(selectedModel)}
              onTurn={(donuk) => commit(items.map((p) => (p.id === selectedItem.id ? { ...p, yon: donuk ? "donuk" : undefined } : p)))}
              onLegs={(ayak) => commit(items.map((p) => (p.id === selectedItem.id ? { ...p, ayak: ayak === DEFAULT_LEG ? undefined : ayak } : p)))}
            />
          )}
          {compare && (
            <div className="mb-6 rounded-xl border border-cizgi p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow">Karşılaştırma</span>
                <button
                  type="button"
                  onClick={() => setCompare(null)}
                  className="-mr-1 flex h-9 items-center gap-1 rounded-full px-2 text-[12px] text-antrasit-70 hover:text-antrasit focus-visible:outline-2 focus-visible:outline-antrasit"
                >
                  <IconClose width={14} height={14} /> Kapat
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Kumaş seçilecek taraf">
                {(
                  [
                    ["sol", "Sol", selected],
                    ["sag", "Sağ", compare.right],
                  ] as const
                ).map(([slot, label, f]) => (
                  <button
                    key={slot}
                    type="button"
                    role="radio"
                    aria-checked={compare.active === slot}
                    onClick={() => setCompare({ ...compare, active: slot })}
                    className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-antrasit ${
                      compare.active === slot ? "border-antrasit bg-white" : "border-cizgi hover:border-cizgi-koyu"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.texture.thumbUrl} alt="" className="h-9 w-9 shrink-0 rounded-full" />
                    <span className="min-w-0">
                      <span className="block text-[11px] text-antrasit-50">{label}</span>
                      <span className="block truncate font-display text-[15px] text-antrasit" translate="no">{f.code}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-snug text-antrasit-50">Seçili tarafa kumaş atamak için aşağıdan bir kumaşa dokunun.</p>
            </div>
          )}
          {items.length > 1 && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg bg-cizgi/40 px-3 py-2 text-[13px]">
              <span className="text-antrasit-70">
                Seçili: <span className="text-antrasit">{selectedModel.name}</span>
              </span>
              {items.some((p) => pieceCodes(p).join() !== pieceCodes(selectedItem).join() || p.ayak !== selectedItem.ayak || p.yon !== selectedItem.yon) && (
                <button type="button" onClick={applyToAll} className="rounded-full px-2 py-1 text-antrasit underline underline-offset-4 hover:text-ceviz focus-visible:outline-2 focus-visible:outline-antrasit">
                  {selectedItem.zones || selectedItem.ayak || selectedItem.yon ? "Bu döşemeyi tümüne uygula" : "Bu kumaşı tümüne uygula"}
                </button>
              )}
            </div>
          )}
          {overlapIds.size > 0 && (
            <p role="status" className="mb-5 rounded-lg bg-[#F4E2DE] px-3 py-2 text-[13px] text-[#8a3a30]">
              Bazı mobilyalar üst üste duruyor. Sürükleyerek ayırın.
            </p>
          )}
          <div className="mb-6">
            <FabricSpecs fabric={shownFabric} />
            {stock && <FabricStock entry={stock[shownFabric.code]} alternatives={alternativesFor(shownFabric, modelFabrics, alternatives?.[shownFabric.code], stock)} onSelect={select} />}
            {shownFabric.description && <p className="mt-3 text-sm leading-relaxed text-antrasit-70">{shownFabric.description}</p>}
            <button
              type="button"
              onClick={() => setTrueScaleOpen(true)}
              className="mt-3 rounded-full border border-cizgi px-3.5 py-2 text-[13px] text-antrasit hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit"
            >
              Gerçek boyutta gör
            </button>
          </div>
          {favorites.codes.length > 0 && (
            <section aria-labelledby="begendiklerim" className="mb-6">
              <h3 id="begendiklerim" className="eyebrow mb-2.5">
                Beğendiklerim · {favorites.codes.length}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {favorites.codes.map((code) => {
                  const f = byCode.get(code);
                  if (!f) return null;
                  return (
                    <li key={code}>
                      <button
                        type="button"
                        onClick={() => select(f)}
                        title={`${f.code} · ${f.colorName}`}
                        className="flex items-center gap-2 rounded-full border border-cizgi py-1 pl-1 pr-3 text-[12px] text-antrasit hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.texture.thumbUrl} alt="" className="h-7 w-7 rounded-full" />
                        <span translate="no">{f.code}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {modelFabrics.length < fabrics.length && (
            <p className="mb-3 rounded-xl bg-cizgi/40 px-3 py-2 text-[13px] text-antrasit-70">
              {selectedModel.name} bu serilerle sunuluyor: {seriesOf(modelFabrics).join(", ")}.
            </p>
          )}
          <FabricPicker fabrics={modelFabrics} selectedCode={shownFabric.code} onSelect={select} onIntent={intent} needs={filters} stock={stock} />
          {/* the "Kendi koltuğunuzda görün — yakında" card was removed (2nd meeting, 5 Oct): the brief
              rules out real AI, so it was a promise we could not keep. lib/ai/reupholster.ts stays for Faz 3. */}
        </div>
        {moduleSet && (
          <div id="bolum-kose" role="tabpanel" aria-labelledby="sekme-kose" hidden={tab !== "kose"}>
            {tab === "kose" && <CornerBuilder sets={moduleSets ?? []} set={moduleSet} onSet={changeSet} value={arrangement} onChange={changeArrangement} error={buildError} />}
          </div>
        )}
        <div id="bolum-oda" role="tabpanel" aria-labelledby="sekme-oda" hidden={tab !== "oda"}>
          {roomTabUsed && <RoomPanel spec={room} onChange={changeRoom} furnitureCm={selectedModel.dimensionsCm} />}
        </div>
        <p className="mt-10 border-t border-cizgi pt-4 text-center text-[11px] tracking-[0.12em] text-antrasit-50 uppercase">
          {firm ? (
            t.signature
          ) : (
            <>
              ORMEN TEKSTİL · Ankara
              {!kiosk && (
                <>
                  {" · "}
                  {/* ORMEN staff only; the site itself needs no sign-in (acil toplantı, 6 Oct) */}
                  <a href="/panel" className="underline-offset-2 hover:underline">
                    Yönetim
                  </a>
                </>
              )}
            </>
          )}
        </p>
      </FabricSheet>
      {assistantOpen && (
        <Asistan
          models={models.filter((m) => m.slug !== KURULUM_SLUG)}
          fabrics={fabrics}
          fabricsFor={(m) => fabricsForModel(fabrics, m)}
          currentModel={selectedModel}
          currentFabric={active}
          waste={waste ?? null}
          firmSlug={firm?.slug ?? null}
          onClose={() => setAssistantOpen(false)}
          onOpen={(m, f) => {
            if (m) swapModel(selectedItem.id, m.slug, f?.code);
            else if (f) select(f);
            setAssistantOpen(false);
          }}
        />
      )}
      {tryOnOpen && (
        <PhotoTryOn
          fabrics={modelFabrics}
          initialCode={active.code}
          firmSlug={firm?.slug ?? null}
          onClose={() => setTryOnOpen(false)}
          // the same fabric on the piece on the screen (the shop's model the customer is looking at)
          onOpen3d={(f) => {
            select(f);
            setTryOnOpen(false);
          }}
          onQuote={
            waste
              ? (f) => {
                  select(f);
                  setTryOnOpen(false);
                  setQuoteOpen(true);
                }
              : null
          }
        />
      )}
      {quoteOpen && waste && (
        <QuoteDialog
          open
          onClose={() => setQuoteOpen(false)}
          items={items}
          models={bySlug}
          fabrics={byCode}
          waste={waste}
          firm={firm ?? null}
          kiosk={kiosk}
          showroom={showroom}
          snapshot={() => stageApi.current?.snapshot() ?? null}
        />
      )}
      {sampleOpen && (
        <SampleDialog
          open
          onClose={() => setSampleOpen(false)}
          fabrics={layoutFabrics}
          firmSlug={firm?.slug ?? null}
          firmName={firm?.name ?? null}
          whatsapp={whatsappNumber}
          modelSlugs={items.map((p) => p.modelSlug)}
          link={shareUrl}
          onSent={(codes) => track("numune_istendi", { firmSlug: firm?.slug, fabricCode: codes[0] })}
        />
      )}
      {share && (
        <ShareDialog
          open
          onClose={() => setShare(null)}
          image={share.image}
          url={share.url}
          text={shareText()}
          fileName={`ORMEN-${layoutFabrics.map((f) => f.code).join("-")}.jpg`}
          onPrint={() => setPrinting({ snapshot: share.snapshot, url: share.url, room, pieces: piecesForShare(), firm })}
        />
      )}
      {printing && <PrintSheet data={printing} onDone={() => setPrinting(null)} />}
      {takeHome && (
        <QrDialog
          open
          onClose={() => setTakeHome(null)}
          title="Telefonunuza alın"
          text="Telefonunuzun kamerasıyla okutun: bu kombinasyon telefonunuzda açılır; evde odanıza bakabilir, numune isteyebilirsiniz."
          url={takeHome}
        />
      )}
      {swapUsed && (
      <ModelSwapDialog
        open={swapFor !== null}
        onClose={() => setSwapFor(null)}
        models={models}
        current={items.find((p) => p.id === swapFor)?.modelSlug ?? null}
        onPick={(slug) => {
          if (swapFor) swapModel(swapFor, slug);
          setSwapFor(null);
        }}
      />
      )}
      {trueScaleUsed && <TrueScaleDialog open={trueScaleOpen} onClose={() => setTrueScaleOpen(false)} fabric={shownFabric} />}
      {feedbackUsed && <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} firmSlug={firm?.slug ?? null} />}
      {arOpen && <ArDialog open onClose={() => setArOpen(false)} model={selectedModel} fabric={selected} zoneFabrics={zoneFabricsOf(selectedItem, byCode)} legFinish={selectedItem.ayak} turned={selectedItem.yon === "donuk"} phoneUrl={arUrl} firmSlug={firm?.slug ?? null} />}
    </div>
  );
}

/**
 * Phone: a bottom sheet that can be pulled up (two stops).
 * Tablet / desktop (md+): a fixed side panel.
 */
function FabricSheet({ header, children }: { header: React.ReactNode; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ y: number; moved: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [expanded]);

  const onDown = (e: RPointerEvent) => {
    start.current = { y: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: RPointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > 4) start.current.moved = true;
    setDrag(dy);
  };
  const onUp = () => {
    if (!start.current) return;
    const { moved } = start.current;
    if (!moved) setExpanded((v) => !v);
    else if (drag < -40) setExpanded(true);
    else if (drag > 40) setExpanded(false);
    start.current = null;
    setDrag(0);
  };

  const base = expanded ? 86 : 42; // dvh
  const height = `calc(${base}dvh - ${drag}px)`;

  return (
    <aside
      aria-label={t.fabrics}
      data-expanded={expanded}
      style={{ "--sheet-h": height } as React.CSSProperties}
      className={`kiosk-zoom group/sheet fixed inset-x-0 bottom-0 z-10 flex h-[var(--sheet-h)] max-h-[92dvh] min-h-[30dvh] flex-col rounded-t-[22px] border-t border-cizgi bg-kagit shadow-[0_-12px_40px_-12px_rgba(42,42,40,0.18)] ${
        drag === 0 ? "transition-[height] duration-300 ease-out-soft" : ""
      } md:static md:z-auto md:h-dvh md:max-h-none md:min-h-0 md:rounded-none md:border-l md:border-t-0 md:shadow-none`}
    >
      <div
        className="flex shrink-0 touch-none flex-col px-5 pt-2 md:px-7 md:pt-7"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          aria-expanded={expanded}
          aria-label={expanded ? t.hideFabrics : t.showFabrics}
          className="mx-auto mb-2 flex h-6 w-16 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-antrasit md:hidden"
        >
          <span className="block h-1 w-10 rounded-full bg-cizgi-koyu" />
        </button>
        {header}
      </div>
      <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 md:px-7">
        {children}
      </div>
    </aside>
  );
}
