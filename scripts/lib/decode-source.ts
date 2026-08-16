import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";

/**
 * Read a local source photo into a buffer sharp can decode.
 *
 * sharp's bundled libheif (1.20.2) parses HEIC containers — `.metadata()`
 * reports `compression: hevc` — but has no HEVC decoder, so any real decode
 * fails with "bad seek". ffmpeg handles those, including reassembling the
 * tiled HEIF grid iPhones write, so route HEIC through it and hand sharp the
 * decoded JPEG. Everything else is read straight off disk.
 */
export async function readDecodable(path: string): Promise<Buffer> {
  if (!/\.heic$/i.test(path)) return readFile(path);
  return decodeWithFfmpeg(path);
}

function decodeWithFfmpeg(path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // -q:v 2 is near-visually-lossless; the result is only an intermediate
    // that gets downscaled to <=3200px and re-encoded as WebP straight after.
    const ff = spawn("ffmpeg", [
      "-v", "error",
      "-i", path,
      "-frames:v", "1",
      "-q:v", "2",
      "-f", "image2pipe",
      "-vcodec", "mjpeg",
      "-",
    ]);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    ff.stdout.on("data", (c) => out.push(c));
    ff.stderr.on("data", (c) => err.push(c));
    ff.on("error", (e) =>
      reject(new Error(`ffmpeg unavailable (needed for HEIC): ${e.message}`)),
    );
    ff.on("close", (code) => {
      if (code === 0 && out.length) return resolve(Buffer.concat(out));
      const detail = Buffer.concat(err).toString().split("\n")[0];
      reject(new Error(`ffmpeg failed on ${path}: ${detail || `exit ${code}`}`));
    });
  });
}
