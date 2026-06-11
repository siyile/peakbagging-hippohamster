import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { MobileMenu } from "@/components/mobile-menu";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/constants";

// Site identity for search engines: enables the proper site name and a
// sitelinks search box in Google results.
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "HippoHamster",
      description:
        "PNW peakbagging route beta with detailed photos: alpine rock, scrambles, and glacier climbs in the Washington Cascades.",
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "HippoHamster",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
  ],
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-hidden">
    <JsonLd data={siteJsonLd} />
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
