// The screen's side of a photo try-on session (job 5): which session is open,
// and ending it when the showroom loop starts, so the customer's photo is
// deleted from the server. Closing the try-on window does not end it: the
// customer may come back to it during the same visit. The server also sweeps
// sessions left open.

export interface OpenSession {
  code: string;
  phoneUrl: string;
  saved: string[];
}

let open: OpenSession | null = null;

export function rememberSession(s: OpenSession | null) {
  open = s;
}

export function openSession(): OpenSession | null {
  return open;
}

/** Ends the open session (files deleted unless the shop kept the photo); never throws. */
export async function endOpenSession(): Promise<void> {
  const s = open;
  open = null;
  if (!s) return;
  try {
    // keepalive: the request survives the page reload that follows
    await fetch(`/api/giydirme/oturum?kod=${encodeURIComponent(s.code)}`, { method: "DELETE", keepalive: true });
  } catch {
    /* the server sweeps it later */
  }
}
