"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type LightboxImage = { src: string; alt: string };

// Article bodies are server-rendered TipTap HTML, so images are plain <img>
// tags — a delegated click listener on this wrapper is the only way to catch
// them without hydrating the whole article.
export function ArticleLightbox({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<LightboxImage | null>(null);

  useEffect(() => {
    if (!image) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImage(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [image]);

  return (
    <>
      <div
        className="contents article-lightbox"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target instanceof HTMLImageElement && !target.closest("a")) {
            setImage({ src: target.currentSrc || target.src, alt: target.alt });
          }
        }}
      >
        {children}
      </div>
      {image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={image.alt || "Fullscreen image"}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 cursor-default"
          onClick={() => setImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- full-size original, already loaded in the article */}
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            aria-label="Close fullscreen image"
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            onClick={() => setImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </>
  );
}
