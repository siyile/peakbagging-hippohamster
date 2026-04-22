"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/seen-posts";

export function TrackVisit({ slug }: { slug: string }) {
  useEffect(() => {
    recordVisit(slug);
  }, [slug]);
  return null;
}
