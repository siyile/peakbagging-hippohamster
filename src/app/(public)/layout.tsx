export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-hidden">
    <div className="mx-auto min-h-screen max-w-[1400px] px-6 py-8">
      <main>{children}</main>
    </div>
    </div>
  );
}
