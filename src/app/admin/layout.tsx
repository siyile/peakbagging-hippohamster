export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <a href="/admin/posts" className="text-xl font-bold">
          Admin
        </a>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <a href="/admin/storage" className="hover:underline">
            Storage
          </a>
          <a href="/admin/login" className="hover:underline">
            Logout
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
