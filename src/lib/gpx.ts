import { XMLParser, XMLBuilder } from "fast-xml-parser";

type Point = [number, number];

function perpDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    const ex = px - ax;
    const ey = py - ay;
    return ex * ex + ey * ey;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  const ex = px - cx;
  const ey = py - cy;
  return ex * ex + ey * ey;
}

function douglasPeucker(points: Point[], tolerance: number): boolean[] {
  const n = points.length;
  const keep = new Array<boolean>(n).fill(false);
  if (n === 0) return keep;
  keep[0] = true;
  keep[n - 1] = true;
  if (n <= 2) return keep;
  const tolSq = tolerance * tolerance;
  const stack: Array<[number, number]> = [[0, n - 1]];
  while (stack.length > 0) {
    const [start, end] = stack.pop()!;
    const [ax, ay] = points[start];
    const [bx, by] = points[end];
    let maxDist = -1;
    let maxIdx = -1;
    for (let i = start + 1; i < end; i++) {
      const [px, py] = points[i];
      const d = perpDistSq(px, py, ax, ay, bx, by);
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }
    if (maxDist > tolSq && maxIdx !== -1) {
      keep[maxIdx] = true;
      stack.push([start, maxIdx]);
      stack.push([maxIdx, end]);
    }
  }
  return keep;
}

function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export function simplifyGpx(gpxString: string, toleranceKm: number): string {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: false,
    processEntities: true,
  });
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: false,
    suppressEmptyNode: false,
    processEntities: true,
  });

  const doc = parser.parse(gpxString);
  const gpx = doc?.gpx;
  if (!gpx) return gpxString;

  type Node = Record<string, unknown>;
  for (const trk of toArray<Node>(gpx.trk as Node | Node[] | undefined)) {
    const segs = toArray<Node>(trk.trkseg as Node | Node[] | undefined);
    for (const seg of segs) {
      const pts = toArray<Node>(seg.trkpt as Node | Node[] | undefined);
      if (pts.length <= 2) continue;
      const lonLat = pts.map((p) => [
        parseFloat(p["@_lon"] as string),
        parseFloat(p["@_lat"] as string),
      ] as Point);
      const centerLat =
        lonLat.reduce((a, [, lat]) => a + lat, 0) / lonLat.length;
      const kx = Math.cos((centerLat * Math.PI) / 180) * 111.32;
      const ky = 111.32;
      const projected: Point[] = lonLat.map(([lon, lat]) => [lon * kx, lat * ky]);
      const keep = douglasPeucker(projected, toleranceKm);
      seg.trkpt = pts.filter((_, i) => keep[i]);
    }
  }

  const body = builder.build(doc);
  const decl = '<?xml version="1.0" encoding="UTF-8"?>\n';
  return body.startsWith("<?xml") ? body : decl + body;
}

export const GPX_SIMPLIFY_TOLERANCE_KM = 0.0005;
export const GPX_SIMPLIFY_MIN_BYTES = 500 * 1024;
