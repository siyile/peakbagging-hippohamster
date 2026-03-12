export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  console.log("[image-upload] uploading file:", file.name, file.type, file.size);

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
  console.log("[image-upload] response:", data);

  if (!data.url) {
    console.error("[image-upload] no url in response:", data);
    throw new Error("No URL returned");
  }

  return data.url;
}
