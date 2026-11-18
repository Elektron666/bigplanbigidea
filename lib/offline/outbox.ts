"use client";

import { afterSend, prune, QUEUE_URLS, type QueuedItem, type QueueUrl } from "./queue";

// The outbox on the device (IndexedDB). Used by the paired showroom screen;
// survives a reload, a reset for the next visitor and a power cut.

const DB = "ormen-showroom";
const STORE = "kuyruk";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function enqueue(url: QueueUrl, body: string, id: string): Promise<void> {
  if (!(QUEUE_URLS as readonly string[]).includes(url)) return;
  await tx("readwrite", (s) => s.put({ id, url, body, at: Date.now(), tries: 0 } satisfies QueuedItem));
}

export async function pending(): Promise<number> {
  try {
    return await tx("readonly", (s) => s.count());
  } catch {
    return 0;
  }
}

/**
 * What the server accepted in this page's life, as {id, type}: shown nowhere,
 * read by the settings sheet's counter and by the tests. Holds no personal data
 * (event records never carry any).
 */
function noteDelivered(item: QueuedItem) {
  let type = "";
  try {
    type = String((JSON.parse(item.body) as { type?: unknown }).type ?? "");
  } catch {
    /* not JSON: counted without a type */
  }
  const w = window as unknown as { __ormenGiden?: { id: string; type: string }[] };
  (w.__ormenGiden ??= []).push({ id: item.id, type });
}

let running: Promise<void> | null = null;

/** Sends what waits, oldest first; stops at the first sign of no connection. One run at a time. */
export function flush(): Promise<void> {
  running ??= (async () => {
    try {
      const items = (await tx<QueuedItem[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedItem[]>)).sort((a, b) => a.at - b.at);
      for (const id of prune(items, Date.now())) await tx("readwrite", (s) => s.delete(id));
      for (const item of items) {
        let status: number | null = null;
        try {
          const res = await fetch(item.url, { method: "POST", body: item.body, headers: { "content-type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(8000) });
          status = res.status;
        } catch {
          status = null;
        }
        if (afterSend(status) === "sil") {
          await tx("readwrite", (s) => s.delete(item.id));
          if (status !== null && status < 300) noteDelivered(item);
        }
        else {
          await tx("readwrite", (s) => s.put({ ...item, tries: item.tries + 1 }));
          // no answer: the connection is down, the rest would fail the same way
          if (status === null) break;
        }
      }
    } catch {
      // storage blocked or full: records are lost, the screen keeps working
    } finally {
      running = null;
    }
  })();
  return running;
}
