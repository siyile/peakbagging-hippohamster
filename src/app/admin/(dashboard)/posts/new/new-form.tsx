"use client";

import { useState, useRef } from "react";
import { createPost } from "../actions";
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
import type { Editor as TiptapEditor } from "@tiptap/react";
import dynamic from "next/dynamic";
import {
  RouteMetadataFields,
  emptyRouteMetadata,
  routeMetadataToPayload,
} from "@/components/admin/route-metadata-fields";
import { TagPills } from "@/components/admin/tag-pills";

const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default function NewPostForm({
  frequentTags,
}: {
  frequentTags: string[];
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [pillTags, setPillTags] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [coverImageThumb, setCoverImageThumb] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [gpxUrl, setGpxUrl] = useState("");
  const [caltopoUrl, setCaltopoUrl] = useState("");
  const [peakbaggerUrl, setPeakbaggerUrl] = useState("");
  const [nwsUrl, setNwsUrl] = useState("");
  const [metadata, setMetadata] = useState(emptyRouteMetadata());
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGpx, setUploadingGpx] = useState(false);
  const editorRef = useRef<TiptapEditor | null>(null);

  const effectiveSlug = slugTouched ? slug : slugify(title);
  const uploadPath =
    effectiveSlug && location ? { location, slug: effectiveSlug } : undefined;

  async function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      alert("Please upload a .gpx file");
      e.target.value = "";
      return;
    }
    if (!effectiveSlug || !location) {
      alert("Please set title/slug and location before uploading files");
      e.target.value = "";
      return;
    }
    setUploadingGpx(true);
    try {
      const { url } = await uploadImage(file, { location, slug: effectiveSlug });
      setGpxUrl(url);
    } finally {
      setUploadingGpx(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!effectiveSlug || !location) {
      alert("Please set title/slug and location before uploading images");
      e.target.value = "";
      return;
    }
    setUploadingCover(true);
    try {
      const { url, thumbUrl } = await uploadImage(file, { location, slug: effectiveSlug, cover: true });
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
    if (!SLUG_PATTERN.test(effectiveSlug)) {
      alert(
        "Slug must be lowercase letters, numbers, and hyphens (e.g. mount-rainier-traverse). It cannot be changed later."
      );
      return;
    }
    setSaving(true);
    try {
      await createPost({
        title,
        slug: effectiveSlug,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Post</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave("draft")}
            disabled={saving}
          >
            Save Draft
          </Button>
          <Button onClick={() => handleSave("published")} disabled={saving}>
            Publish
          </Button>
        </div>
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
        <Label htmlFor="slug">Slug (permanent — cannot be changed later)</Label>
        <Input
          id="slug"
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          placeholder="mount-rainier-traverse"
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
        />
        <p className="text-xs text-muted-foreground">
          Used in the URL: /posts/{effectiveSlug || "your-slug"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Excerpt</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setExcerpt(e.target.value)}
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
        <Editor editorRef={editorRef} uploadPath={uploadPath} />
      </div>
    </div>
  );
}
