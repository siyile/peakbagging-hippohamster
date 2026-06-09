"use client";

import { useState, useRef } from "react";
import { updatePost, deletePost } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadImage } from "@/components/editor/image-upload";
import { LOCATION_TAGS } from "@/lib/constants";
import type { Post } from "@/db/schema";
import type { Editor as TiptapEditor, JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  RouteMetadataFields,
  routeMetadataToPayload,
  type RouteMetadataValues,
} from "@/components/admin/route-metadata-fields";
import { TagPills } from "@/components/admin/tag-pills";

const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
});

function formatDate(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function EditPostForm({
  post,
  tags: initialTags,
  frequentTags,
}: {
  post: Post;
  tags: string[];
  frequentTags: string[];
}) {
  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description || "");
  const initialLocation = initialTags.find((t) =>
    (LOCATION_TAGS as readonly string[]).includes(t)
  ) || "";
  const frequentTagSet = new Set(frequentTags);
  const initialPillTags = initialTags.filter((t) => frequentTagSet.has(t));
  const initialTextTags = initialTags.filter(
    (t) =>
      !(LOCATION_TAGS as readonly string[]).includes(t) &&
      !frequentTagSet.has(t)
  );
  const [tags, setTags] = useState(initialTextTags.join(", "));
  const [pillTags, setPillTags] = useState<string[]>(initialPillTags);
  const [location, setLocation] = useState(initialLocation);
  const [coverImage, setCoverImage] = useState(post.coverImage || "");
  const [coverImageThumb, setCoverImageThumb] = useState(post.coverImageThumb || "");
  const [tripDate, setTripDate] = useState(formatDate(post.tripDate));
  const [gpxUrl, setGpxUrl] = useState(post.gpxUrl || "");
  const [caltopoUrl, setCaltopoUrl] = useState(post.caltopoUrl || "");
  const [peakbaggerUrl, setPeakbaggerUrl] = useState(post.peakbaggerUrl || "");
  const [nwsUrl, setNwsUrl] = useState(post.nwsUrl || "");
  const [metadata, setMetadata] = useState<RouteMetadataValues>({
    elevationFt: post.elevationFt != null ? String(post.elevationFt) : "",
    elevationGainFt:
      post.elevationGainFt != null ? String(post.elevationGainFt) : "",
    distanceMiles: post.distanceMiles != null ? String(post.distanceMiles) : "",
    timeCategory: post.timeCategory || "",
    rockRating: post.rockRating != null ? String(post.rockRating) : "",
    glacierRating: post.glacierRating || "",
    snowRating: post.snowRating || "",
    offTrailRatio: post.offTrailRatio != null ? String(post.offTrailRatio) : "",
    isSkiTouring: post.isSkiTouring ?? false,
  });
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGpx, setUploadingGpx] = useState(false);
  const editorRef = useRef<TiptapEditor | null>(null);

  const uploadPath = title && location ? { location, slug: post.slug } : undefined;

  const actionButtons = (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          if (confirm("Discard unsaved changes?")) router.push("/admin/posts");
        }}
      >
        Back
      </Button>
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        Delete
      </Button>
      <Button
        variant="outline"
        onClick={() => handleSave("draft")}
        disabled={saving}
      >
        Save Draft
      </Button>
      <Button onClick={() => handleSave("published")} disabled={saving}>
        {post.status === "published" ? "Update" : "Publish"}
      </Button>
    </div>
  );

  async function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      alert("Please upload a .gpx file");
      e.target.value = "";
      return;
    }
    if (!title || !location) {
      alert("Please set title and location before uploading files");
      e.target.value = "";
      return;
    }
    setUploadingGpx(true);
    try {
      const { url } = await uploadImage(file, { location, slug: post.slug });
      setGpxUrl(url);
    } finally {
      setUploadingGpx(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title || !location) {
      alert("Please set title and location before uploading images");
      e.target.value = "";
      return;
    }
    setUploadingCover(true);
    try {
      const { url, thumbUrl } = await uploadImage(file, { location, slug: post.slug, cover: true });
      setCoverImage(url);
      if (thumbUrl) setCoverImageThumb(thumbUrl);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave(status: string) {
    const content = editorRef.current?.getJSON();
    if (!title || !location || !content) {
      alert("Title and location are required");
      return;
    }
    setSaving(true);
    try {
      await updatePost(post.id, {
        title,
        content: JSON.stringify(content),
        description: description || undefined,
        coverImage: coverImage || undefined,
        coverImageThumb: coverImageThumb || undefined,
        tripDate: tripDate || undefined,
        gpxUrl: gpxUrl || undefined,
        caltopoUrl: caltopoUrl || undefined,
        peakbaggerUrl: peakbaggerUrl || undefined,
        nwsUrl: nwsUrl || undefined,
        ...routeMetadataToPayload(metadata),
        tags: Array.from(
          new Set([
            ...tags.split(",").map((t) => t.trim()).filter(Boolean),
            ...pillTags,
            ...(location ? [location] : []),
          ])
        ),
        status,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this post?")) return;
    await deletePost(post.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Post</h1>
        {actionButtons}
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (permanent)</Label>
        <Input id="slug" value={post.slug} readOnly disabled />
        <p className="text-xs text-muted-foreground">
          URL: /posts/{post.slug}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description for previews"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover">Cover Image</Label>
        {coverImage && (
          <div className="relative">
            <img
              src={coverImage}
              alt="Cover preview"
              className="aspect-[3/2] w-full rounded-md border object-cover"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => { setCoverImage(""); setCoverImageThumb(""); }}
            >
              Remove
            </Button>
          </div>
        )}
        <Input
          id="cover"
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          disabled={uploadingCover}
        />
        {uploadingCover && (
          <p className="text-sm text-muted-foreground">Uploading...</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Glacier Climb, Scramble"
        />
        <TagPills
          frequentTags={frequentTags}
          selected={pillTags}
          onToggle={(tag) =>
            setPillTags((prev) =>
              prev.includes(tag)
                ? prev.filter((t) => t !== tag)
                : [...prev, tag]
            )
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger id="location">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {LOCATION_TAGS.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tripDate">Trip Date</Label>
          <Input
            id="tripDate"
            type="date"
            value={tripDate}
            onChange={(e) => setTripDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gpx">GPX Track</Label>
        {gpxUrl && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground truncate flex-1">{gpxUrl}</span>
            <Button variant="destructive" size="sm" onClick={() => setGpxUrl("")}>
              Remove
            </Button>
          </div>
        )}
        <Input
          id="gpx"
          type="file"
          accept=".gpx"
          onChange={handleGpxUpload}
          disabled={uploadingGpx}
        />
        {uploadingGpx && (
          <p className="text-sm text-muted-foreground">Uploading...</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="caltopoUrl">CalTopo Map URL</Label>
          <Input
            id="caltopoUrl"
            value={caltopoUrl}
            onChange={(e) => setCaltopoUrl(e.target.value)}
            placeholder="https://caltopo.com/m/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="peakbaggerUrl">Peakbagger URL</Label>
          <Input
            id="peakbaggerUrl"
            value={peakbaggerUrl}
            onChange={(e) => setPeakbaggerUrl(e.target.value)}
            placeholder="https://peakbagger.com/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nwsUrl">National Weather Service URL</Label>
          <Input
            id="nwsUrl"
            value={nwsUrl}
            onChange={(e) => setNwsUrl(e.target.value)}
            placeholder="https://forecast.weather.gov/..."
          />
        </div>
      </div>

      <RouteMetadataFields values={metadata} onChange={setMetadata} />

      <div className="space-y-2">
        <Label>Content</Label>
        <Editor
          initialContent={post.content as JSONContent}
          editorRef={editorRef}
          uploadPath={uploadPath}
        />
      </div>

      <div className="flex justify-end">{actionButtons}</div>
    </div>
  );
}
