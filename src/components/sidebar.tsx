import Image from "next/image";
import Link from "next/link";
import { LOCATION_TAGS } from "@/lib/constants";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Alpine Climb", href: "/tags/Alpine Climb" },
  { label: "Scramble", href: "/tags/Scramble" },
  { label: "Ski Touring", href: "/tags/Ski Touring" },
  { label: "About Us", href: "/about" },
];

export function Sidebar() {
  return (
    <aside className="sticky top-8 self-start">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="Hippo Hamster" width={72} height={72} />
        <span className="text-2xl font-bold text-brand">
          Hippo
          <br />
          Hamster
        </span>
      </Link>

      <p className="mt-3 text-sm text-muted-foreground">
        PNW peakbagging route beta with full detailed pictures. Climb, scramble
        and more!
      </p>

      <nav className="mt-6 flex flex-col gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="text-lg font-medium text-muted-foreground hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        <h3 className="text-lg text-muted-foreground font-medium">Location</h3>
        <nav className="mt-1 flex flex-col gap-1">
          {LOCATION_TAGS.map((loc) => (
            <Link
              key={loc}
              href={`/tags/${loc}`}
              className="text-brand hover:underline font-medium"
            >
              {loc}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
