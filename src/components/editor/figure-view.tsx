"use client";

import { type NodeViewProps } from "@tiptap/core";
import { NodeViewWrapper } from "@tiptap/react";

export function FigureNodeView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  return (
    <NodeViewWrapper
      as="figure"
      className={`image-figure ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <img src={node.attrs.src} alt={node.attrs.alt || ""} />
      <input
        type="text"
        value={node.attrs.caption || ""}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
        placeholder="Add a caption..."
        className="caption-input"
      />
    </NodeViewWrapper>
  );
}
