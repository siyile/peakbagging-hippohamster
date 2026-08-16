import Image from "@tiptap/extension-image";
import { mergeAttributes } from "@tiptap/core";
import { IMAGE_SIZES } from "@/lib/image-variants";

export const FigureImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: null,
        renderHTML: () => ({}),
      },
      // Intrinsic size of the default variant. Rendered so the browser can
      // reserve the box before the image arrives — without these every photo
      // in the article shifts the layout as it lazy-loads.
      width: { default: null },
      height: { default: null },
      // Inline ladder only. Paired with sizes so a phone doesn't pull the
      // 1600px file for a 390px slot.
      srcset: {
        default: null,
        renderHTML: (attrs) =>
          attrs.srcset ? { srcset: attrs.srcset, sizes: IMAGE_SIZES } : {},
      },
      // Full-resolution variant, fetched by the lightbox on click only. Kept
      // out of srcset so it never loads with the page.
      full: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-full"),
        renderHTML: (attrs) => (attrs.full ? { "data-full": attrs.full } : {}),
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
            width: img.getAttribute("width"),
            height: img.getAttribute("height"),
            srcset: img.getAttribute("srcset"),
            full: img.getAttribute("data-full"),
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
      decoding: "async",
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
