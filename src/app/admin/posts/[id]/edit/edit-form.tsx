"use client";

import { useState, useRef } from "react";
import { updatePost, deletePost } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImage } from "@/components/editor/image-upload";
import type { Post } from "@/db/schema";
import type { Editor as TiptapEditor, JSONContent } from "@tiptap/react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/editor/editor"), {
  ssr: false,
});

function formatDate(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function EditPostForm({ post }: { post: Post }) {
  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description || "");
  const [tags, setTags] = useState(post.tags?.join(", ") || "");
  const [coverImage, setCoverImage] = useState(post.coverImage || "");
  const [tripDate, setTripDate] = useState(formatDate(post.tripDate));
  const [gpxUrl, setGpxUrl] = useState(post.gpxUrl || "");
  const [peakbaggerUrl, setPeakbaggerUrl] = useState(post.peakbaggerUrl || "");
  const [nwsUrl, setNwsUrl] = useState(post.nwsUrl || "");
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGpx, setUploadingGpx] = useState(false);
  const editorRef = useRef<TiptapEditor | null>(null);

  async function handleGpxUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".gpx")) {
      alert("Please upload a .gpx file");
      e.target.value = "";
      return;
    }
    setUploadingGpx(true);
    try {
      const url = await uploadImage(file);
      setGpxUrl(url);
    } finally {
      setUploadingGpx(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const url = await uploadImage(file);
      setCoverImage(url);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSave(status: string) {
    const content = editorRef.current?.getJSON();
    if (!title || !content) return;
    setSaving(true);
    try {
      await updatePost(post.id, {
        title,
        content: JSON.stringify(content),
        description: description || undefined,
        coverImage: coverImage || undefined,
        tripDate: tripDate || undefined,
        gpxUrl: gpxUrl || undefined,
        peakbaggerUrl: peakbaggerUrl || undefined,
        nwsUrl: nwsUrl || undefined,

        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
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
        <div className="flex gap-2">
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
              className="h-48 w-full rounded-md border object-cover"
            />
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => setCoverImage("")}
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tech, tutorial, life"
          />
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

      <div className="grid grid-cols-2 gap-4">
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

      <div className="space-y-2">
        <Label>Content</Label>
        <Editor
          initialContent={post.content as JSONContent}
          editorRef={editorRef}
        />
      </div>
    </div>
  );
}
