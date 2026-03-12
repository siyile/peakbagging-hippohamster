"use client";

import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  CodeSquare,
  ImagePlus,
  Undo,
  Redo,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadImage } from "./image-upload";

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1.5 transition-colors disabled:opacity-30 ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="mx-0.5 h-4 w-px bg-border" />;
}

export function EditorToolbar({ editor }: { editor: Editor }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const onUpdate = () => setTick((n) => n + 1);
    editor.on("transaction", onUpdate);
    return () => { editor.off("transaction", onUpdate); };
  }, [editor]);

  const setLink = useCallback(() => {
    const url = window.prompt("URL", editor.getAttributes("link").href || "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const url = await uploadImage(file);
        console.log("[toolbar] inserting image with url:", url);
        const result = editor.chain().focus().setImage({ src: url }).run();
        console.log("[toolbar] setImage result:", result);
        console.log("[toolbar] editor JSON after insert:", JSON.stringify(editor.getJSON()));
      } catch (err) {
        console.error("[toolbar] image upload error:", err);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [editor],
  );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-t-lg border-b bg-background p-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        isActive={editor.isActive("heading", { level: 1 })}
      >
        <Heading1 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        isActive={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        isActive={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
      >
        <Strikethrough className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
      >
        <Code className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton onClick={setLink} isActive={editor.isActive("link")}>
        <Link className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
      >
        <Quote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive("codeBlock")}
      >
        <CodeSquare className="size-4" />
      </ToolbarButton>

      <Separator />

      <ToolbarButton onClick={() => fileInputRef.current?.click()}>
        <ImagePlus className="size-4" />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
    </div>
  );
}
