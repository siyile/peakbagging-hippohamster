"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LOCATION_TAGS } from "@/lib/constants";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Bar — always visible, stays above backdrop */}
      <div className="relative z-50 flex items-center justify-between px-4 pt-3 pb-2 bg-background border-b border-gray-300">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Hippo Hamster" width={48} height={48} />
          <span className="text-xl font-bold text-brand">Hippo Hamster</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 text-muted-foreground hover:text-foreground"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 right-0 z-50 flex flex-col bg-background border-b shadow-lg">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="w-full border-t px-4 py-3 text-lg font-medium text-muted-foreground hover:bg-muted"
            >
              Home
            </Link>
            <Link
              href="/tags/Alpine Rock"
              onClick={() => setOpen(false)}
              className="w-full border-t px-4 py-3 text-lg font-medium text-muted-foreground hover:bg-muted"
            >
              Alpine Rock
            </Link>
            <Link
              href="/tags/Scramble"
              onClick={() => setOpen(false)}
              className="w-full border-t px-4 py-3 text-lg font-medium text-muted-foreground hover:bg-muted"
            >
              Scramble
            </Link>
            <Link
              href="/tags/Ski Touring"
              onClick={() => setOpen(false)}
              className="w-full border-t px-4 py-3 text-lg font-medium text-muted-foreground hover:bg-muted"
            >
              Ski Touring
            </Link>
            <Link
              href="/about"
              onClick={() => setOpen(false)}
              className="w-full border-t px-4 py-3 text-lg font-medium text-muted-foreground hover:bg-muted"
            >
              About Us
            </Link>
            <div className="border-t px-4 py-3">
              <h3 className="text-lg font-medium text-muted-foreground">Location</h3>
            </div>
            {LOCATION_TAGS.map((loc) => (
              <Link
                key={loc}
                href={`/tags/${loc}`}
                onClick={() => setOpen(false)}
                className="w-full border-t px-6 py-3 text-lg font-medium text-brand hover:bg-muted"
              >
                {loc}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
