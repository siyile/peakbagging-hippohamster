import { db } from "@/db";
import { posts } from "@/db/schema";
import { listR2Objects } from "@/lib/r2";

export type OrphanObject = {
  key: string;
  size: number;
  lastModified: Date | null;
};

export type ScanResult = {
  orphans: OrphanObject[];
  totalObjects: number;
  totalBytes: number;
};

const UPLOADS_PREFIX = "uploads/";
// Files at uploads/static/ are referenced by hardcoded URLs in source (e.g.
// hero-banner.tsx, about/page.tsx) — never tracked in the DB. Treat as safe.
const PROTECTED_PREFIXES = ["uploads/static/"];

// Post content written before the custom-domain switch still references the
// legacy r2.dev base. Match both bases so those images are never treated as
// orphans and deleted.
const LEGACY_PUBLIC_BASE =
  "https://pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev";

function publicBases(): string[] {
  return [...new Set([process.env.R2_PUBLIC_URL!, LEGACY_PUBLIC_BASE])];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractKeyFromUrl(
  url: string | null,
  bases: string[]
): string | null {
  if (!url) return null;
  for (const publicBase of bases) {
    const base = publicBase.endsWith("/") ? publicBase : `${publicBase}/`;
    if (!url.startsWith(base)) continue;
    const rest = url.slice(base.length);
    const stripped = rest.split("?")[0].split("#")[0];
    if (stripped) return stripped;
  }
  return null;
}

// Tiptap stores image nodes with attrs.src, but content may include other
// shapes (links to GPX, custom node types, etc). Walking the JSONB as text
// catches every URL that points at our public base, regardless of node shape.
function extractKeysFromContent(
  content: unknown,
  bases: string[],
  acc: Set<string>
): void {
  if (content == null) return;
  const text = typeof content === "string" ? content : JSON.stringify(content);
  for (const publicBase of bases) {
    const base = publicBase.endsWith("/") ? publicBase : `${publicBase}/`;
    const re = new RegExp(`${escapeRegex(base)}[^"'\\s)<>]+`, "g");
    for (const match of text.match(re) ?? []) {
      const key = extractKeyFromUrl(match, bases);
      if (key) acc.add(key);
    }
  }
}

export async function collectReferencedKeys(): Promise<Set<string>> {
  const bases = publicBases();
  const rows = await db
    .select({
      coverImage: posts.coverImage,
      coverImageThumb: posts.coverImageThumb,
      gpxUrl: posts.gpxUrl,
      content: posts.content,
    })
    .from(posts);

  const referenced = new Set<string>();
  for (const row of rows) {
    const cover = extractKeyFromUrl(row.coverImage, bases);
    if (cover) referenced.add(cover);
    const thumb = extractKeyFromUrl(row.coverImageThumb, bases);
    if (thumb) referenced.add(thumb);
    const gpx = extractKeyFromUrl(row.gpxUrl, bases);
    if (gpx) {
      referenced.add(gpx);
      // Upload route stores the simplified `{slug}-hippohamster.gpx` URL but
      // also uploads a `{slug}-hippohamster-original.gpx` sibling that is
      // never recorded in the DB. Treat that sibling as referenced.
      if (gpx.endsWith(".gpx") && !gpx.endsWith("-original.gpx")) {
        referenced.add(gpx.replace(/\.gpx$/, "-original.gpx"));
      }
    }
    extractKeysFromContent(row.content, bases, referenced);
  }
  return referenced;
}

function isProtected(key: string): boolean {
  return PROTECTED_PREFIXES.some((p) => key.startsWith(p));
}

export async function scanOrphans(): Promise<ScanResult> {
  const [referenced, objects] = await Promise.all([
    collectReferencedKeys(),
    listR2Objects(UPLOADS_PREFIX),
  ]);

  const orphans: OrphanObject[] = [];
  for (const obj of objects) {
    if (!obj.Key) continue;
    if (isProtected(obj.Key)) continue;
    if (referenced.has(obj.Key)) continue;
    orphans.push({
      key: obj.Key,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified ?? null,
    });
  }
  orphans.sort((a, b) => {
    const at = a.lastModified?.getTime() ?? 0;
    const bt = b.lastModified?.getTime() ?? 0;
    return bt - at;
  });

  const totalBytes = orphans.reduce((sum, o) => sum + o.size, 0);
  return { orphans, totalObjects: objects.length, totalBytes };
}

export function isProtectedKey(key: string): boolean {
  return isProtected(key);
}
