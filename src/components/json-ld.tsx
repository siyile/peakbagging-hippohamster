// Renders a JSON-LD <script> for structured data. Server component.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON.stringify does not escape "<", so a post field containing "</script>"
  // would close this tag and let the rest execute as markup. < is a valid
  // JSON escape that parses back to "<", so consumers see the same data.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
