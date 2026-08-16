"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

type LightboxImage = {
  /** Already in browser cache — paints instantly. */
  preview: string;
  /** Full-resolution variant, fetched only now. */
  full: string;
  alt: string;
};

// Article bodies are server-rendered TipTap HTML, so images are plain <img>
// tags — a delegated click listener on this wrapper is the only way to catch
// them without hydrating the whole article.
export function ArticleLightbox({ children }: { children: ReactNode }) {
  const [image, setImage] = useState<LightboxImage | null>(null);
  const [fullReady, setFullReady] = useState(false);

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

  const open = (target: HTMLImageElement) => {
    const preview = target.currentSrc || target.src;
    setFullReady(false);
    setImage({
      preview,
      // Posts predating the derivative ladder have no data-full; they just
      // reuse the inline image, exactly as before.
      full: target.dataset.full || preview,
      alt: target.alt,
    });
  };

  return (
    <>
      <div
        className="contents article-lightbox"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target instanceof HTMLImageElement && !target.closest("a")) {
            open(target);
          }
        }}
        // Start the full-res fetch on hover so it is usually already in flight
        // by the time the click lands.
        onPointerOver={(e) => {
          const target = e.target as HTMLElement;
          if (target instanceof HTMLImageElement && target.dataset.full) {
            const pre = new window.Image();
            pre.src = target.dataset.full;
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
          <div className="relative flex h-full w-full items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- cached inline variant, shown until the full-res decodes */}
            <img
              src={image.preview}
              alt={image.alt}
              className="max-h-full max-w-full object-contain"
            />
            {image.full !== image.preview && (
              /* eslint-disable-next-line @next/next/no-img-element -- full-res original, fetched on open */
              <img
                src={image.full}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                onLoad={() => setFullReady(true)}
                className={`absolute inset-0 m-auto max-h-full max-w-full object-contain transition-opacity duration-200 ${
                  fullReady ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
          </div>
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
