import { Sidebar } from "@/components/sidebar";

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[var(--sidebar-w,240px)_1fr] gap-8 [--sidebar-w:180px] [--featured-w:280px]">
      <Sidebar />
      <div>{children}</div>
    </div>
  );
}
