"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recomputeSimilarities } from "./actions";

export function RecomputeButton() {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const onClick = () => {
    setStatus(null);
    startTransition(async () => {
      const res = await recomputeSimilarities();
      setStatus(
        `Done: ${res.rows} row${res.rows === 1 ? "" : "s"} in ${(
          res.durationMs / 1000
        ).toFixed(1)}s`
      );
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={onClick} disabled={pending}>
        {pending ? "Recomputing…" : "Recompute"}
      </Button>
      {status && (
        <span className="text-sm text-muted-foreground">{status}</span>
      )}
    </div>
  );
}
