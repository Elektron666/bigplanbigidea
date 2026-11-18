import { describe, expect, it } from "vitest";
import { afterSend, newClientId, prune, QUEUE_MAX, QUEUE_MAX_AGE_MS, type QueuedItem } from "@/lib/offline/queue";
import { parseEvent } from "@/lib/events";

describe("showroom outbox", () => {
  it("drops a record once the server took it, or refused it for good; keeps it otherwise", () => {
    expect(afterSend(204)).toBe("sil");
    expect(afterSend(201)).toBe("sil");
    expect(afterSend(422)).toBe("sil"); // malformed: retrying cannot help
    expect(afterSend(413)).toBe("sil");
    expect(afterSend(null)).toBe("tut"); // no answer: offline
    expect(afterSend(429)).toBe("tut");
    expect(afterSend(408)).toBe("tut");
    expect(afterSend(500)).toBe("tut");
    expect(afterSend(503)).toBe("tut");
  });

  it("never grows without end: drops what is too old and what is beyond the newest records", () => {
    const now = Date.parse("2026-11-18T12:00:00Z");
    const item = (id: string, ageMs: number): QueuedItem => ({ id, url: "/api/olay", body: "{}", at: now - ageMs, tries: 0 });
    expect(prune([item("yeni", 1000), item("eski", QUEUE_MAX_AGE_MS + 1)], now)).toEqual(["eski"]);
    const many = Array.from({ length: QUEUE_MAX + 5 }, (_, i) => item(`k${i}`, i * 1000));
    const dropped = prune(many, now);
    expect(dropped).toHaveLength(5);
    // the oldest go first
    expect(dropped).toEqual(["k2000", "k2001", "k2002", "k2003", "k2004"]);
  });

  it("makes ids the server accepts", () => {
    const id = newClientId();
    expect(id).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(newClientId()).not.toBe(id);
    expect(parseEvent({ type: "kumas_denendi", sessionId: "abcdefgh12", clientId: id })?.clientId).toBe(id);
  });
});
