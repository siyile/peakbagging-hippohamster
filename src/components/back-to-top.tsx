"use client";

export function BackToTop() {
  return (
    <div className="flex justify-end py-8 px-4 md:px-6">
      <button
        className="text-brand border border-brand/30 rounded-md px-4 py-1.5 text-sm cursor-pointer transition-colors hover:bg-brand/5"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        Back to top
      </button>
    </div>
  );
}
