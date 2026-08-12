"use client";

import { useEffect } from "react";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    // One count per browser session per post; also guards React StrictMode's
    // double effect invocation in dev.
    const key = `viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (e.g. blocked storage); still count the view
    }
    const url = "/api/views";
    if (!navigator.sendBeacon?.(url, slug)) {
      fetch(url, { method: "POST", body: slug, keepalive: true }).catch(
        () => {}
      );
    }
  }, [slug]);

  return null;
}
