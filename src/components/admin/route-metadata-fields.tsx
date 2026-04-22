"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TIME_CATEGORIES,
  ROCK_RATINGS,
  GLACIER_RATINGS,
  OFF_TRAIL_RATIOS,
} from "@/lib/post-metadata";

export interface RouteMetadataValues {
  elevationFt: string;
  elevationGainFt: string;
  distanceMiles: string;
  timeCategory: string;
  rockRating: string;
  glacierRating: string;
  offTrailRatio: string;
  isSkiTouring: boolean;
}

export function RouteMetadataFields({
  values,
  onChange,
}: {
  values: RouteMetadataValues;
  onChange: (next: RouteMetadataValues) => void;
}) {
  const set = <K extends keyof RouteMetadataValues>(
    key: K,
    v: RouteMetadataValues[K]
  ) => onChange({ ...values, [key]: v });

  return (
    <div className="space-y-4 border-t pt-4">
      <h2 className="text-sm font-semibold text-muted-foreground">
        Route Metadata
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="elevationFt">Elevation (ft)</Label>
          <Input
            id="elevationFt"
            type="number"
            inputMode="numeric"
            value={values.elevationFt}
            onChange={(e) => set("elevationFt", e.target.value)}
            placeholder="e.g. 10541"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="elevationGainFt">Elevation Gain (ft)</Label>
          <Input
            id="elevationGainFt"
            type="number"
            inputMode="numeric"
            value={values.elevationGainFt}
            onChange={(e) => set("elevationGainFt", e.target.value)}
            placeholder="e.g. 4200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="distanceMiles">Distance (miles)</Label>
          <Input
            id="distanceMiles"
            type="number"
            step="0.1"
            inputMode="decimal"
            value={values.distanceMiles}
            onChange={(e) => set("distanceMiles", e.target.value)}
            placeholder="e.g. 12.5"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timeCategory">Time</Label>
          <Select
            value={values.timeCategory}
            onValueChange={(v) => set("timeCategory", v)}
          >
            <SelectTrigger id="timeCategory">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {TIME_CATEGORIES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rockRating">Rock Rating</Label>
          <Select
            value={values.rockRating}
            onValueChange={(v) => set("rockRating", v)}
          >
            <SelectTrigger id="rockRating">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {ROCK_RATINGS.map((r) => (
                <SelectItem key={r.value} value={String(r.value)}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="glacierRating">Glacier Rating</Label>
          <Select
            value={values.glacierRating}
            onValueChange={(v) => set("glacierRating", v)}
          >
            <SelectTrigger id="glacierRating">
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {GLACIER_RATINGS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="offTrailRatio">Off-trail Ratio</Label>
          <Select
            value={values.offTrailRatio}
            onValueChange={(v) => set("offTrailRatio", v)}
          >
            <SelectTrigger id="offTrailRatio">
              <SelectValue placeholder="Select ratio" />
            </SelectTrigger>
            <SelectContent>
              {OFF_TRAIL_RATIOS.map((r) => (
                <SelectItem key={r} value={String(r)}>
                  {r}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 pb-2">
          <input
            id="isSkiTouring"
            type="checkbox"
            className="h-4 w-4"
            checked={values.isSkiTouring}
            onChange={(e) => set("isSkiTouring", e.target.checked)}
          />
          <Label htmlFor="isSkiTouring" className="cursor-pointer">
            Ski touring trip
          </Label>
        </div>
      </div>
    </div>
  );
}

export function emptyRouteMetadata(): RouteMetadataValues {
  return {
    elevationFt: "",
    elevationGainFt: "",
    distanceMiles: "",
    timeCategory: "",
    rockRating: "",
    glacierRating: "",
    offTrailRatio: "",
    isSkiTouring: false,
  };
}

export function routeMetadataToPayload(values: RouteMetadataValues) {
  const parseInt = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) && s !== "" ? Math.trunc(n) : null;
  };
  const parseFloat = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) && s !== "" ? n : null;
  };
  return {
    elevationFt: parseInt(values.elevationFt),
    elevationGainFt: parseInt(values.elevationGainFt),
    distanceMiles: parseFloat(values.distanceMiles),
    timeCategory: values.timeCategory || null,
    rockRating: parseInt(values.rockRating),
    glacierRating: values.glacierRating || null,
    offTrailRatio: parseInt(values.offTrailRatio),
    isSkiTouring: values.isSkiTouring,
  };
}
