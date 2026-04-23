"use client";

import { useRef, useState } from "react";
import { SearchOverlay } from "./search-overlay";

export function SearchButton({
  className = "",
  ariaLabel = "Search",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          // Focus must be called synchronously inside the user gesture,
          // otherwise iOS Safari refuses to open the soft keyboard.
          inputRef.current?.focus();
          setOpen(true);
        }}
        aria-label={ariaLabel}
        className={className}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
      <SearchOverlay
        open={open}
        onClose={() => setOpen(false)}
        inputRef={inputRef}
      />
    </>
  );
}
