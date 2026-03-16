import { MobileMenu } from "@/components/mobile-menu";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-hidden">
    <MobileMenu />
    <div className="mx-auto min-h-screen max-w-[1400px] px-0 py-0 md:px-6 md:py-8">
      <main>{children}</main>
    </div>
    </div>
  );
}
