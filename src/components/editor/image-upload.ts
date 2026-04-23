export async function uploadImage(
  file: File,
  opts?: { location?: string; slug?: string; cover?: boolean }
): Promise<{ url: string; thumbUrl?: string }> {
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
    throw new Error("Upload failed");
  }

  const data = await res.json();

  if (!data.url) {
    throw new Error("No URL returned");
  }

  return { url: data.url, thumbUrl: data.thumbUrl };
}
