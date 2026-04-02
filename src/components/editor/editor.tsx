"use client";

import {
  useEditor,
  EditorContent,
  type JSONContent,
  type Editor as TiptapEditor,
} from "@tiptap/react";
import { useEffect, useRef } from "react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { FigureImage } from "@/lib/figure-image";
import { FigureNodeView } from "./figure-view";
import { EditorToolbar } from "./toolbar";
import { uploadImage } from "./image-upload";

interface UploadPath {
  location: string;
  slug: string;
}

interface EditorProps {
  initialContent?: JSONContent;
  editorRef?: React.MutableRefObject<TiptapEditor | null>;
  uploadPath?: UploadPath;
}

export default function Editor({ initialContent, editorRef, uploadPath }: EditorProps) {
  const uploadPathRef = useRef(uploadPath);
  useEffect(() => {
    uploadPathRef.current = uploadPath;
  }, [uploadPath]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      FigureImage.extend({
        addNodeView() {
          return ReactNodeViewRenderer(FigureNodeView);
        },
      }).configure({ allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing..." }),
    ],
    content: initialContent,
    editorProps: {
      scrollMargin: { top: 80, bottom: 200, left: 0, right: 0 },
      scrollThreshold: { top: 80, bottom: 200, left: 0, right: 0 },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;

        const file = files[0];
        if (!file.type.startsWith("image/")) return false;

        event.preventDefault();
        uploadImage(file, uploadPathRef.current).then(({ url }) => {
          const pos =
            view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            })?.pos ?? view.state.selection.from;
          const node = view.state.schema.nodes.image.create({ src: url });
          view.dispatch(view.state.tr.insert(pos, node));
        });
        return true;
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return false;
            uploadImage(file, uploadPathRef.current).then(({ url }) => {
              const node = view.state.schema.nodes.image.create({ src: url });
              view.dispatch(view.state.tr.replaceSelectionWith(node));
            });
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border bg-background">
      <EditorToolbar editor={editor} uploadPath={uploadPath} />
      <EditorContent
        editor={editor}
        className="prose dark:prose-invert max-w-none p-4"
      />
    </div>
  );
}
