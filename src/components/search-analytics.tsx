"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function SearchAnalytics({ query }: { query: string }) {
  useEffect(() => {
    if (!query) return;
    window.gtag?.("event", "search", { search_term: query });
  }, [query]);
  return null;
}
