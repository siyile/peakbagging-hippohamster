/** Attributes the FigureImage node needs to render a responsive figure. */
export type UploadedImage = {
  src: string;
  srcset?: string;
  full?: string;
  width?: number;
  height?: number;
};

export async function uploadImage(
  file: File,
  opts?: { location?: string; slug?: string; cover?: boolean }
): Promise<UploadedImage & { url: string; thumbUrl?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (opts?.location) formData.append("location", opts.location);
  if (opts?.slug) formData.append("slug", opts.slug);
  if (opts?.cover) formData.append("cover", "true");

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[image-upload] upload failed:", res.status, text);
    // The route explains refusals (HEIC, unreadable file) in `error`; surface
    // that rather than a blanket failure the user can't act on.
    let message = "Upload failed";
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) message = parsed.error;
    } catch {
      /* non-JSON body — keep the generic message */
    }
    throw new Error(message);
  }

  const data = await res.json();

  if (!data.url) {
    throw new Error("No URL returned");
  }

  return {
    url: data.url,
    thumbUrl: data.thumbUrl,
    src: data.url,
    srcset: data.srcset,
    full: data.full,
    width: data.width,
    height: data.height,
  };
}

/** Node attributes for an uploaded image, dropping keys the server omitted. */
export function imageNodeAttrs(uploaded: UploadedImage): Record<string, unknown> {
  const { src, srcset, full, width, height } = uploaded;
  return Object.fromEntries(
    Object.entries({ src, srcset, full, width, height }).filter(
      ([, v]) => v !== undefined && v !== null,
    ),
  );
}
