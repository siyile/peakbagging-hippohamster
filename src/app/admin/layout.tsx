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
        <form action="/admin/login" method="GET">
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:underline"
          >
            Logout
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
