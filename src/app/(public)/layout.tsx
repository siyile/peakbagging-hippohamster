import { Sidebar } from "@/components/sidebar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-[240px_1fr] gap-12 px-6 py-8">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
