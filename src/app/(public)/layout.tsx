import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { MobileMenu } from "@/components/mobile-menu";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-hidden">
    {process.env.NODE_ENV === "production" && (
      <>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7V4RNJS99Y"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7V4RNJS99Y');
          `}
        </Script>
      </>
    )}
    <MobileMenu />
    <div className="mx-auto min-h-dvh max-w-[1400px] px-0 py-0 md:px-6 md:py-8">
      <main>{children}</main>
    </div>
    <Analytics />
    <SpeedInsights />
    </div>
  );
}
