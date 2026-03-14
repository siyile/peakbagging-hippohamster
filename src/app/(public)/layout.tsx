import { Sidebar } from "@/components/sidebar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-[var(--sidebar-w,240px)_1fr] gap-8 px-6 py-8 [--sidebar-w:180px] [--featured-w:280px]">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
