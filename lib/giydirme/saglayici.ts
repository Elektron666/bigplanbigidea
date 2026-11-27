// The image provider behind "Fotoğraftan dene" (Showroom package, job 5):
// one interface, so the provider can be changed later. Server only.
//
// Para harcanmıyor (Fatih Bey, 15 Kasım): no paying provider is wired in.
// "sahte" is a local stand-in for development and tests: it makes a visibly
// fake picture (the photo washed with the fabric and stamped "DENEME"), costs
// nothing and calls nobody. A real provider is one more file implementing
// GiydirmeProvider, picked with GIYDIRME_SAGLAYICI once ORMEN has chosen and
// approved it (PLAN-SHOWROOM.md, provider comparison). Until then the feature
// stays off on the screens: a half feature is not shown.

export interface GiydirmeInput {
  /** The customer's photo, JPEG. */
  photo: Uint8Array;
  /** The fabric's real photo from the panel (its albedo texture), JPEG/PNG/WebP. */
  fabricImage: Uint8Array;
  instruction: string;
  signal: AbortSignal;
}

export interface GiydirmeOutput {
  image: Uint8Array;
  /** The provider's own price for this picture, USD; null when it does not say. */
  costUsd: number | null;
}

/** Job 15 ("Müşterinin salonu"): the customer's room and a picture of the product as the 3D shows it. */
export interface SalonInput {
  room: Uint8Array;
  product: Uint8Array;
  instruction: string;
  signal: AbortSignal;
}

export interface GiydirmeProvider {
  id: string;
  name: string;
  /** What one picture is expected to cost, USD, for the panel's estimates; null = unknown. */
  costPerImageUsd: number | null;
  generate(input: GiydirmeInput): Promise<GiydirmeOutput>;
  /** The product put into the customer's room photo; a provider that cannot do it leaves it out (then the button is not shown). */
  placeInRoom?(input: SalonInput): Promise<GiydirmeOutput>;
}

/** The provider set for this server, or null (then the feature is off everywhere). */
export async function getProvider(): Promise<GiydirmeProvider | null> {
  const id = process.env.GIYDIRME_SAGLAYICI?.trim();
  if (id === "sahte") return (await import("./sahte")).sahteProvider;
  // real providers join here, each in its own file, once approved
  return null;
}
