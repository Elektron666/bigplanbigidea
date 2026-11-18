// Fixed parts of the quote that pages need without loading the PDF library.

/** Printed at the foot of every quote (task section 6). */
export const COLOR_NOTE = "Ekran renkleri bağlayıcı değildir; renk onayı numuneyle verilir.";

// The quote PDF's font files (Inter, Latin and Latin Extended; regular and bold),
// served from public/fonts/teklif. Kept apart from pdf.ts so the server can name
// them (the showroom's offline list) without loading the PDF library.
export const PDF_FONT_FILES = {
  regular: ["/fonts/teklif/inter-latin-400-normal.woff", "/fonts/teklif/inter-latin-ext-400-normal.woff"],
  bold: ["/fonts/teklif/inter-latin-600-normal.woff", "/fonts/teklif/inter-latin-ext-600-normal.woff"],
} as const;

/** A fabric order request's steps at ORMEN. */
export const ORDER_STATUSES = ["yeni", "goruldu", "hazirlaniyor", "gonderildi", "iptal"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = { yeni: "Yeni", goruldu: "Görüldü", hazirlaniyor: "Hazırlanıyor", gonderildi: "Gönderildi", iptal: "İptal" };
