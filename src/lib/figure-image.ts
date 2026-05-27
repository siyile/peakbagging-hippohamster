import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";

export const FigureImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const img = el.querySelector("img");
          if (!img) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt"),
            title: img.getAttribute("title"),
            caption: el.querySelector("figcaption")?.textContent || null,
          };
        },
      },
      { tag: "img[src]" },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = node.attrs.caption;
    const imgAttrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      loading: "lazy",
    });
    if (caption) {
      return [
        "figure",
        { class: "image-figure" },
        ["img", imgAttrs],
        ["figcaption", {}, caption],
      ];
    }
    return [
      "figure",
      { class: "image-figure" },
      ["img", imgAttrs],
    ];
  },
});
