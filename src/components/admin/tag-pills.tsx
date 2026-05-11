"use client";

const PALETTE = [
  {
    selected:
      "border-violet-500/40 bg-violet-500/15 text-violet-700 hover:bg-violet-500/25 dark:text-violet-300",
    unselected:
      "hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-700 dark:hover:text-violet-300",
  },
  {
    selected:
      "border-sky-500/40 bg-sky-500/15 text-sky-700 hover:bg-sky-500/25 dark:text-sky-300",
    unselected:
      "hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300",
  },
  {
    selected:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300",
    unselected:
      "hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300",
  },
  {
    selected:
      "border-amber-500/40 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300",
    unselected:
      "hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-300",
  },
  {
    selected:
      "border-rose-500/40 bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-300",
    unselected:
      "hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300",
  },
];

function colorIndex(tag: string): number {
  let h = 0;
  for (let i = 0; i < tag.length; i++) {
    h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return h % PALETTE.length;
}

export function TagPills({
  frequentTags,
  selected,
  onToggle,
}: {
  frequentTags: string[];
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  if (frequentTags.length === 0) return null;

  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {frequentTags.map((tag) => {
        const isSelected = selectedSet.has(tag);
        const palette = PALETTE[colorIndex(tag)];
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={
              "cursor-pointer select-none rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors " +
              (isSelected
                ? palette.selected
                : "border-border bg-muted/40 text-muted-foreground " +
                  palette.unselected)
            }
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
