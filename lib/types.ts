import type { ParametricParams } from "@/lib/parametric/spec";
import type { ProductCategory } from "@/lib/catalogue/products";
// Domain types shared by the data layer, server components and the configurator.

export const FABRIC_TYPES = [
  "bukle",
  "dokuma",
  "nubuk",
  "kadife",
  "sonil",
  "keten-gorunumlu",
  "jakar",
] as const;
export type FabricType = (typeof FABRIC_TYPES)[number];

export const COLOR_FAMILIES = [
  "beyaz-krem",
  "bej-kum",
  "kahve",
  "gri",
  "antrasit-siyah",
  "yesil",
  "mavi",
  "kirmizi-bordo",
  "sari-hardal",
  "turuncu-kiremit",
  "pembe",
  "mor",
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export type TextureSize = "1k" | "2k";

export interface TextureMapSet {
  /** Colour (albedo) map, sRGB. */
  albedo: Record<TextureSize, string>;
  /** Tangent-space normal map, linear. Absent when it was neither uploaded nor derived. */
  normal?: Record<TextureSize, string>;
  /** Roughness map (greyscale), linear. */
  roughness?: Record<TextureSize, string>;
}

export interface FabricTexture {
  maps: TextureMapSet;
  /** Real-world size of one texture tile in centimetres. */
  repeatCm: { w: number; h: number };
  /** Sheen overrides; when absent the fabric type preset is used. */
  sheen?: number;
  sheenRoughness?: number;
  /** Small swatch preview image. */
  thumbUrl: string;
  /** Mean albedo colour (sRGB hex), used for placeholders and colour checks. */
  avgColor: string;
}

export interface Fabric {
  id: string;
  /** Unique fabric code, e.g. SIENA-04. */
  code: string;
  series: string;
  colorName: string;
  colorFamily: ColorFamily;
  type: FabricType;
  composition?: string;
  widthCm?: number;
  /** Plain or patterned; missing = not known (then no metres are worked out). */
  pattern?: "duz" | "desenli";
  /** Pattern repeat of a patterned fabric, cm. */
  patternRepeatCm?: { w: number; h: number };
  /** "tek": pile or pattern runs one way, pieces cannot be turned; "cift": they can. */
  cutDirection?: "cift" | "tek";
  weightGsm?: number;
  martindale?: number;
  fireRating?: string;
  description?: string;
  isActive: boolean;
  isPlaceholder: boolean;
  sortOrder: number;
  texture: FabricTexture;
}

export interface Firm {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  accentColor: string;
  whatsapp?: string;
  /** Fabric series shown on the firm's page; empty or missing = all. */
  fabricSeries?: string[];
  /** Ready-made scenes shown when the page opens (lib/firm-presets.ts). */
  presets?: { name: string; id: string }[];
  /** Per-shop features (lib/central/features.ts); missing keys take their defaults. */
  features?: Record<string, boolean>;
  isActive: boolean;
}

export type ModelSource =
  | { kind: "procedural"; generator: "modular-sofa" | "armchair" }
  /** Described in the panel with a few choices, built from code (lib/parametric). */
  | { kind: "parametric"; params: ParametricParams }
  | { kind: "glb"; url: string }
  /** A corner set built from uploaded module GLBs (lib/modul): each file put on its joints. */
  | { kind: "moduller"; parts: ModulePart[]; mirrored: boolean; floor?: { x0: number; x1: number; z0: number; z1: number }[] };

export interface ModulePart {
  url: string;
  /** A corner module (its joints are its front-left and back-right corners). */
  corner: boolean;
  /** The model's own joints (GLB cm); missing: from its box. */
  joints?: { sol: { x: number; z: number }; sag: { x: number; z: number } };
  /** Where they go on the floor (cm, the back wall at z = 0). */
  target: { sol: { x: number; z: number }; sag: { x: number; z: number } };
}

export interface FurnitureModel {
  id: string;
  slug: string;
  name: string;
  /** null = ORMEN's generic showcase model. */
  firmId: string | null;
  source: ModelSource;
  /** Material names inside the model that receive the fabric. */
  fabricMaterialNames: string[];
  dimensionsCm: { w: number; d: number; h: number };
  defaultFabricCode?: string;
  /** Fabric series offered on this model; empty or missing = all. */
  fabricSeries?: string[];
  /** The firm's own fabric metres for one piece, for the cutter's sheet (lib/metraj.ts). */
  meterage?: {
    metres: number;
    refWidthCm: number;
    zones?: Partial<Record<"govde" | "kol" | "oturak" | "sirt", number>>;
    /** Parts beyond the zones the firm counts separately (Kırlent, Biye…), same fabric width (job 3). */
    extra?: { name: string; metres: number }[];
  };
  coverUrl?: string;
  /** Who makes it (central catalogue). */
  manufacturer?: string;
  category?: ProductCategory;
  /** Advisor tags (job 10, lib/asistan/etiketler.ts): style and use, as set in the panel. */
  styleTags?: string[];
  useTags?: string[];
  isActive: boolean;
  sortOrder: number;
  // --- how one shop shows a shared product (lib/catalogue/shop-products.ts); absent everywhere else
  /** The centre's name, when the shop shows the product under its own. */
  centralName?: string;
  /** The shop's own product code. */
  productCode?: string;
  /** The shop's own note about the product. */
  shopNote?: string;
  /** Brought forward by the shop. */
  featured?: boolean;
  /** A corner set built from modules on the screen (lib/modul): its arrangement code. */
  kurulum?: string;
  /** The set's top view, for the quote's PDF (job 4: "PDF'e şema da girer"). */
  diagram?: SetDiagram;
}

/** A built corner set seen from above, cm (x across, z towards the front, the back wall at z = 0). */
export interface SetDiagram {
  widthCm: number;
  depthCm: number;
  backCm: number;
  leftCm: number;
  rightCm: number;
  rects: { x: number; z: number; w: number; d: number; corner: boolean; label: string }[];
}
