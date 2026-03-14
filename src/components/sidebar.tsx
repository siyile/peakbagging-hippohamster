import Image from "next/image";
import Link from "next/link";

const climbLinks = [
  { label: "North Cascades", href: "#" },
  { label: "South Cascades", href: "#" },
  { label: "Mount Rainier", href: "#" },
  { label: "Alpine Lakes Wilderness", href: "#" },
];

export function Sidebar() {
  return (
    <aside className="sticky top-8 self-start">
      <Link href="/" className="flex items-center gap-2">
        <Image src="/logo.png" alt="Hippo Hamster" width={72} height={72} />
        <span className="text-2xl font-bold text-[#0078A0]">
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
        <Link href="/" className="text-lg font-medium text-muted-foreground hover:text-foreground">
          Home
        </Link>
        <Link href="#" className="text-lg font-medium text-muted-foreground hover:text-foreground">
          About Us
        </Link>
      </nav>

      <div className="mt-6">
        <h3 className="text-lg text-muted-foreground font-medium">Climbs</h3>
        <nav className="mt-1 flex flex-col gap-1">
          {climbLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[#0078A0] hover:underline font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
