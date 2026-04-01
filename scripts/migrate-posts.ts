import { config } from "dotenv";
config({ path: ".env.local" });

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { posts, tags, postTags } from "../src/db/schema";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";

// ── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const awsS3 = new S3Client({ region: "us-west-2" });

const sqlClient = neon(process.env.DATABASE_URL!);
const db = drizzle(sqlClient);

const R2_BUCKET = process.env.R2_BUCKET_NAME!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const SOURCE_S3_BUCKET = "peak-bagging-website-static";

const GITHUB_RAW =
  "https://raw.githubusercontent.com/siyile/peakbagging-static/main/content/posts";

// ── Post Definitions ────────────────────────────────────────────────────────

interface PostConfig {
  slug: string;
  githubPath: string;
  imageDir: string;
  location: string;
  fallbackImageDirs?: string[];
}

const POSTS: PostConfig[] = [
  {
    slug: "cannon-mountain",
    githubPath: "alpine_lake_wilderness/cannon_mountain",
    imageDir: "E:/Photo/Blog/alpine_lake_wilderness/cannon_mountain",
    location: "Alpine Lakes Wilderness",
  },
  {
    slug: "chair-peak",
    githubPath: "alpine_lake_wilderness/chair_peak",
    imageDir: "E:/Photo/Blog/chair_peak",
    location: "Alpine Lakes Wilderness",
  },
  {
    slug: "chikamin-peak",
    githubPath: "alpine_lake_wilderness/chikamin_peak",
    imageDir: "E:/Photo/Blog/chikamin_peak",
    location: "Alpine Lakes Wilderness",
  },
  {
    slug: "huckleberry-mountain",
    githubPath: "alpine_lake_wilderness/huckleberry_mountain",
    imageDir: "E:/Photo/Blog/huckleberry_mountain",
    location: "Alpine Lakes Wilderness",
  },
  {
    slug: "kaleetan-peak",
    githubPath: "alpine_lake_wilderness/kaleetan_peak",
    imageDir: "E:/Photo/Blog/kaleetan",
    location: "Alpine Lakes Wilderness",
  },
  {
    slug: "mcclellan-butte",
    githubPath: "alpine_lake_wilderness/mc_clellan_butte",
    imageDir: "E:/Photo/Blog/mc_clellan_butte",
    location: "Alpine Lakes Wilderness",
  },
  {
    slug: "mount-thompson",
    githubPath: "alpine_lake_wilderness/mount_thompson",
    imageDir: "E:/Photo/Blog/mount_thompson",
    location: "Alpine Lakes Wilderness",
  },
  {
    slug: "snoqualmie-pass-north-traverse",
    githubPath: "alpine_lake_wilderness/snoqualmie_pass_north_traverse",
    imageDir: "E:/Photo/Blog/snoqualmie_pass_north_traverse",
    location: "Alpine Lakes Wilderness",
    fallbackImageDirs: [
      "E:/Photo/Blog/mount_thompson",
      "E:/Photo/Blog/huckleberry_mountain",
      "E:/Photo/Blog/chikamin_peak",
    ],
  },
  {
    slug: "gunn-peak",
    githubPath: "index_area/gunn_peak",
    imageDir: "E:/Photo/Blog/gunn_peak",
    location: "Index Area",
  },
  {
    slug: "boundary-peak",
    githubPath: "mount_rainier/boundary_peak",
    imageDir: "E:/Photo/Blog/boundary",
    location: "Mount Rainier National Park",
  },
  {
    slug: "cowlitz-chimneys",
    githubPath: "mount_rainier/cowlitz_chimneys",
    imageDir: "E:/Photo/Blog/cowlitz_chimneys",
    location: "Mount Rainier National Park",
  },
  {
    slug: "white-chuck-mountain",
    githubPath: "mountain_loop_highway/white_chuck_mountain",
    imageDir: "E:/Photo/Blog/white_chuck_mountain",
    location: "Mountain Loop Highway",
  },
  {
    slug: "big-craggy-west-craggy",
    githubPath: "north_cascades/big_craggy_west_craggy",
    imageDir: "E:/Photo/Blog/big_craggy",
    location: "North Cascades",
  },
  {
    slug: "black-peak",
    githubPath: "north_cascades/black_peak",
    imageDir: "E:/Photo/Blog/black_peak",
    location: "North Cascades",
  },
  {
    slug: "north-gardner-mountain",
    githubPath: "north_cascades/north_gardner_mountain",
    imageDir: "E:/Photo/Blog/north_gardner",
    location: "North Cascades",
  },
  {
    slug: "tomyhoi-peak",
    githubPath: "north_cascades/tomyhoi_peak",
    imageDir: "E:/Photo/Blog/tomyhoi_peak",
    location: "North Cascades",
  },
  {
    slug: "gilbert-peak",
    githubPath: "south_cascades/gilbert_peak",
    imageDir: "E:/Photo/Blog/gilbert_peak",
    location: "South Cascades",
  },
  {
    slug: "ives-peak",
    githubPath: "south_cascades/ives_peak",
    imageDir: "E:/Photo/Blog/ives_peak",
    location: "South Cascades",
  },
];

const OLD_PATH_TO_SLUG: Record<string, string> = {};
for (const p of POSTS) {
  OLD_PATH_TO_SLUG[p.githubPath] = p.slug;
}

// ── R2 Cleanup ──────────────────────────────────────────────────────────────

async function deleteAllR2Uploads() {
  console.log("Deleting existing R2 uploads...");
  if (DRY_RUN) {
    console.log("  [dry-run] Would delete all objects under uploads/");
    return;
  }

  let continuationToken: string | undefined;
  let totalDeleted = 0;

  do {
    const list = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: "uploads/",
        ContinuationToken: continuationToken,
      })
    );

    const objects = list.Contents;
    if (!objects || objects.length === 0) break;

    await r2.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: objects.map((o) => ({ Key: o.Key })) },
      })
    );

    totalDeleted += objects.length;
    continuationToken = list.NextContinuationToken;
  } while (continuationToken);

  console.log(`  Deleted ${totalDeleted} objects from R2.`);
}

// ── Image Helpers ───────────────────────────────────────────────────────────

interface LocalImage {
  filepath: string;
  needsSharp: boolean; // true for originals, false for resize/ webps
}

const IMAGE_EXTS = [".jpeg", ".jpg", ".png", ".heic", ".webp", ".gif"];

async function buildLocalStemMap(
  imageDir: string
): Promise<Map<string, LocalImage>> {
  const map = new Map<string, LocalImage>();

  // Scan main directory for original images (need sharp processing)
  try {
    const entries = await fs.readdir(imageDir);
    for (const entry of entries) {
      if (entry.toLowerCase() === "resize") continue;
      const ext = path.extname(entry).toLowerCase();
      if (!IMAGE_EXTS.includes(ext)) continue;
      const stem = path.basename(entry, path.extname(entry)).toLowerCase();
      if (/^(img_|pxl_|dsc)/i.test(stem)) continue;
      if (ext === ".heic") continue;
      map.set(stem, {
        filepath: path.join(imageDir, entry),
        needsSharp: true,
      });
    }
  } catch {
    // directory may not exist
  }

  // Scan resize/ for pre-processed webp images (no sharp needed)
  const resizeDir = path.join(imageDir, "resize");
  try {
    const entries = await fs.readdir(resizeDir);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (!IMAGE_EXTS.includes(ext)) continue;
      const stem = path.basename(entry, path.extname(entry)).toLowerCase();
      if (!map.has(stem)) {
        map.set(stem, {
          filepath: path.join(resizeDir, entry),
          needsSharp: false,
        });
      }
    }
  } catch {
    // resize dir may not exist
  }

  return map;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");

async function uploadToR2(
  buffer: Buffer,
  contentType: string,
  location: string,
  slug: string,
  imageName: string
): Promise<string> {
  const key = `uploads/${slugify(location)}/${slugify(slug)}/${imageName}.webp`;

  if (DRY_RUN) {
    console.log(`    [dry-run] Would upload ${key} (${buffer.length} bytes)`);
    return `${R2_PUBLIC_URL}/${key}`;
  }

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

async function downloadFromSourceS3(
  githubPath: string,
  stem: string
): Promise<Buffer | null> {
  const key = `${githubPath}/${stem}.webp`;
  try {
    const res = await awsS3.send(
      new GetObjectCommand({ Bucket: SOURCE_S3_BUCKET, Key: key })
    );
    if (res.Body) {
      return Buffer.from(await res.Body.transformToByteArray());
    }
  } catch {
    // not found
  }
  return null;
}

async function uploadAllImages(
  postConfig: PostConfig,
  imageStems: string[]
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  const localMap = await buildLocalStemMap(postConfig.imageDir);

  // Build fallback from explicit directories
  const fallbackMap = new Map<string, LocalImage>();
  if (postConfig.fallbackImageDirs) {
    for (const dir of postConfig.fallbackImageDirs) {
      const fbMap = await buildLocalStemMap(dir);
      for (const [stem, img] of fbMap) {
        if (!fallbackMap.has(stem)) fallbackMap.set(stem, img);
      }
    }
  }

  for (const stem of imageStems) {
    const stemLower = stem.toLowerCase();
    const localImg = localMap.get(stemLower) || fallbackMap.get(stemLower);

    let finalBuffer: Buffer | null = null;
    let contentType = "image/webp";

    if (localImg) {
      // Local file found
      const rawBuffer = await fs.readFile(localImg.filepath);
      if (localImg.needsSharp) {
        // Original image — resize and convert to webp
        finalBuffer = await sharp(rawBuffer)
          .resize(1600, undefined, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
      } else {
        // Already resized — upload as-is
        finalBuffer = rawBuffer;
      }
    } else {
      // Fall back to source S3 bucket (already resized)
      finalBuffer = await downloadFromSourceS3(
        postConfig.githubPath,
        stemLower
      );
      if (finalBuffer) {
        console.log(`    Downloaded from S3: ${stemLower}`);
      }
    }

    if (!finalBuffer) {
      console.warn(`    WARNING: Image not found: ${stem}`);
      continue;
    }

    try {
      const url = await uploadToR2(
        finalBuffer,
        contentType,
        postConfig.location,
        postConfig.slug,
        stemLower
      );
      imageMap.set(stemLower, url);
    } catch (e) {
      console.warn(`    WARNING: Failed to upload image ${stem}: ${e}`);
    }
  }

  return imageMap;
}

// ── Markdown Preprocessing ──────────────────────────────────────────────────

interface Extracted {
  cleanMd: string;
  caltopoUrl?: string;
  peakbaggerUrl?: string;
}

function preprocess(rawMd: string): Extracted {
  let md = rawMd;
  let caltopoUrl: string | undefined;
  let peakbaggerUrl: string | undefined;

  const iframeMatch = md.match(
    /<iframe\s+src="(https:\/\/caltopo\.com\/m\/[^"]+)"/
  );
  if (iframeMatch) caltopoUrl = iframeMatch[1];

  md = md.replace(/<iframe[^>]*>.*?<\/iframe>/g, "");
  md = md.replace(/^.*Clip.*[Cc]altopo.*$/gm, "");

  const pbMatch = md.match(
    /https:\/\/www\.peakbagger\.com\/climber\/ascent\.aspx\?aid=\d+/
  );
  if (pbMatch) peakbaggerUrl = pbMatch[0];

  md = md.replace(/^\s*GPS\s*(?:track|Track)?:\s*https?:\/\/.*$/gm, "");
  md = md.replace(/^##\s+Map(?:\s+and\s+GPS\s+track)?\s*$/gm, "");

  md = md.replace(
    /https?:\/\/www\.hippohamster\.com\/posts\/([^)\s]+)\/?/g,
    (_match, oldPath) => {
      const cleaned = oldPath.replace(/\/$/, "");
      const slug = OLD_PATH_TO_SLUG[cleaned];
      if (slug) return `/posts/${slug}`;
      for (const [op, s] of Object.entries(OLD_PATH_TO_SLUG)) {
        if (op.endsWith(cleaned) || cleaned.endsWith(op.split("/").pop()!)) {
          return `/posts/${s}`;
        }
      }
      return `/posts/${cleaned}`;
    }
  );

  md = md.replace(/\n{3,}/g, "\n\n");
  return { cleanMd: md.trim(), caltopoUrl, peakbaggerUrl };
}

function extractImageStems(md: string): string[] {
  const stems = new Set<string>();
  const regex = /!\[[^\]]*\]\(imgs\/([^)]+)\)/g;
  let match;
  while ((match = regex.exec(md)) !== null) {
    const filename = match[1];
    const stem = filename.replace(/\.[^.]+$/, "");
    stems.add(stem);
  }
  return [...stems];
}

// ── Markdown → TipTap JSON ─────────────────────────────────────────────────

type TipTapNode = {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, any> }[];
};

type Mark = { type: string; attrs?: Record<string, any> };

function convertInline(
  node: any,
  imageMap: Map<string, string>,
  marks: Mark[] = []
): TipTapNode[] {
  switch (node.type) {
    case "text": {
      const n: TipTapNode = { type: "text", text: node.value };
      if (marks.length > 0) n.marks = [...marks];
      return [n];
    }
    case "strong":
      return (node.children || []).flatMap((c: any) =>
        convertInline(c, imageMap, [...marks, { type: "bold" }])
      );
    case "emphasis":
      return (node.children || []).flatMap((c: any) =>
        convertInline(c, imageMap, [...marks, { type: "italic" }])
      );
    case "link": {
      const href = node.url || "";
      return (node.children || []).flatMap((c: any) =>
        convertInline(c, imageMap, [
          ...marks,
          { type: "link", attrs: { href, target: "_blank" } },
        ])
      );
    }
    case "inlineCode": {
      return [
        {
          type: "text",
          text: node.value,
          marks: [...marks, { type: "code" }],
        },
      ];
    }
    case "break":
      return [{ type: "hardBreak" }];
    case "image":
      return [];
    default:
      return [];
  }
}

function convertParagraph(
  node: any,
  imageMap: Map<string, string>
): TipTapNode[] {
  const result: TipTapNode[] = [];
  let inlineBuffer: TipTapNode[] = [];

  function flushInline() {
    if (inlineBuffer.length === 0) return;
    const hasText = inlineBuffer.some(
      (n) => (n.type === "text" && n.text?.trim()) || n.type === "hardBreak"
    );
    if (hasText) {
      result.push({ type: "paragraph", content: inlineBuffer });
    }
    inlineBuffer = [];
  }

  for (const child of node.children || []) {
    if (child.type === "image") {
      flushInline();
      const stem = (child.url || "")
        .replace(/^imgs\//, "")
        .replace(/\.[^.]+$/, "")
        .toLowerCase();
      const src = imageMap.get(stem) || child.url;
      const caption = child.alt || null;
      result.push({
        type: "image",
        attrs: { src, alt: caption, caption },
      });
    } else {
      inlineBuffer.push(...convertInline(child, imageMap));
    }
  }

  flushInline();
  return result;
}

function convertBlock(
  node: any,
  imageMap: Map<string, string>
): TipTapNode[] {
  switch (node.type) {
    case "root":
    case "document":
      return (node.children || []).flatMap((c: any) =>
        convertBlock(c, imageMap)
      );

    case "heading": {
      const content = (node.children || []).flatMap((c: any) =>
        convertInline(c, imageMap)
      );
      if (content.length === 0) return [];
      return [
        { type: "heading", attrs: { level: node.depth || 1 }, content },
      ];
    }

    case "paragraph":
      return convertParagraph(node, imageMap);

    case "blockquote": {
      const content = (node.children || []).flatMap((c: any) =>
        convertBlock(c, imageMap)
      );
      if (content.length === 0) return [];
      return [{ type: "blockquote", content }];
    }

    case "list": {
      const listType = node.ordered ? "orderedList" : "bulletList";
      const content = (node.children || []).flatMap((c: any) =>
        convertBlock(c, imageMap)
      );
      if (content.length === 0) return [];
      return [{ type: listType, content }];
    }

    case "listItem": {
      const content = (node.children || []).flatMap((c: any) =>
        convertBlock(c, imageMap)
      );
      if (content.length === 0) return [];
      return [{ type: "listItem", content }];
    }

    case "thematicBreak":
      return [{ type: "horizontalRule" }];

    case "html": {
      const text = (node.value || "").trim();
      if (!text || text.startsWith("<iframe")) return [];
      return [{ type: "paragraph", content: [{ type: "text", text }] }];
    }

    case "code":
      return [
        {
          type: "codeBlock",
          attrs: { language: node.lang || null },
          content: [{ type: "text", text: node.value }],
        },
      ];

    default:
      return [];
  }
}

function markdownToTiptap(
  mdContent: string,
  imageMap: Map<string, string>
): TipTapNode {
  const tree = unified().use(remarkParse).parse(mdContent);
  const content = convertBlock(tree, imageMap);

  const filtered = content.filter(
    (n) =>
      n.type === "image" ||
      n.type === "horizontalRule" ||
      n.type === "hardBreak" ||
      (n.content && n.content.length > 0)
  );

  return { type: "doc", content: filtered };
}

// ── Main Migration ──────────────────────────────────────────────────────────

async function fetchMarkdown(githubPath: string): Promise<string> {
  const url = `${GITHUB_RAW}/${githubPath}/index.md`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function ensureTag(name: string): Promise<number> {
  const existing = await db
    .select()
    .from(tags)
    .where(eq(tags.name, name))
    .limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(tags).values({ name }).returning();
  return result[0].id;
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN ===" : "=== STARTING MIGRATION ===");
  console.log();

  // 1. Delete existing R2 uploads
  await deleteAllR2Uploads();
  console.log();

  // 2. Clear DB
  console.log("Clearing existing posts...");
  if (!DRY_RUN) {
    await db.delete(postTags);
    await db.delete(posts);
    await db.delete(tags);
  }
  console.log("  Done.");
  console.log();

  // 3. Process each post
  let successCount = 0;

  for (const postConfig of POSTS) {
    console.log(`Processing: ${postConfig.slug}`);

    try {
      const rawFile = await fetchMarkdown(postConfig.githubPath);
      const { data: frontmatter, content: rawContent } = matter(rawFile);

      const imageStems = extractImageStems(rawContent);

      // Include cover image stem
      const coverStemRaw = (frontmatter.image || "")
        .replace(/^imgs\//, "")
        .replace(/\.[^.]+$/, "");
      if (coverStemRaw && !imageStems.includes(coverStemRaw)) {
        imageStems.push(coverStemRaw);
      }

      console.log(`  Found ${imageStems.length} images`);

      const imageMap = await uploadAllImages(postConfig, imageStems);
      console.log(`  Uploaded ${imageMap.size} images`);

      const { cleanMd, caltopoUrl, peakbaggerUrl } = preprocess(rawContent);
      const tiptapDoc = markdownToTiptap(cleanMd, imageMap);

      const coverImage =
        imageMap.get(coverStemRaw.toLowerCase()) || null;

      const categories: string[] = frontmatter.categories || [];
      const activityTag = categories.includes("climb")
        ? "alpine rock"
        : "scramble";

      const tripDate = frontmatter.date ? new Date(frontmatter.date) : null;

      console.log(`  CalTopo: ${caltopoUrl || "none"}`);
      console.log(`  Peakbagger: ${peakbaggerUrl || "none"}`);
      console.log(`  Tags: ${activityTag}, ${postConfig.location}`);

      if (!DRY_RUN) {
        const [inserted] = await db
          .insert(posts)
          .values({
            title: frontmatter.title,
            slug: postConfig.slug,
            content: tiptapDoc,
            description: frontmatter.description || null,
            coverImage,
            tripDate,
            caltopoUrl: caltopoUrl || null,
            peakbaggerUrl: peakbaggerUrl || null,
            status: "published",
            publishedAt: tripDate,
          })
          .returning();

        const activityTagId = await ensureTag(activityTag);
        const locationTagId = await ensureTag(postConfig.location);

        await db.insert(postTags).values([
          { postId: inserted.id, tagId: activityTagId },
          { postId: inserted.id, tagId: locationTagId },
        ]);

        console.log(`  Inserted post #${inserted.id}`);
      }

      successCount++;
    } catch (e) {
      console.error(`  ERROR processing ${postConfig.slug}:`, e);
    }

    console.log();
  }

  console.log(`=== DONE: ${successCount}/${POSTS.length} posts migrated ===`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
