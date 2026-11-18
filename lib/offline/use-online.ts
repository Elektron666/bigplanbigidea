"use client";

import { useSyncExternalStore } from "react";

// Whether the device says it has a connection. The browser's own flag only
// knows about the network interface; it is used here for what the screen
// shows and disables, never to decide whether a record is sent (the outbox
// simply tries, and keeps what does not get through).

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
