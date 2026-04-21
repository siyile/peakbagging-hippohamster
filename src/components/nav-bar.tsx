import Link from "next/link";
import { LOCATION_TAGS } from "@/lib/constants";
import { SearchButton } from "@/components/search-button";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Alpine Rock", href: "/tags/Alpine Rock" },
  { label: "Scramble", href: "/tags/Scramble" },
  { label: "Ski Touring", href: "/tags/Ski Touring" },
  { label: "About Us", href: "/about" },
];

export function NavBar() {
  return (
    <nav className="hidden md:flex items-center justify-center gap-8 py-4">
      {navLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="text-foreground hover:text-brand font-medium"
        >
          {link.label}
        </Link>
      ))}
      <div className="relative group">
        <button className="text-foreground hover:text-brand font-medium cursor-pointer">
          Location ▾
        </button>
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-1 hidden group-hover:block z-50">
          <div className="bg-white shadow-lg rounded-md py-2 min-w-[240px] border">
            {LOCATION_TAGS.map((loc) => (
              <Link
                key={loc}
                href={`/tags/${loc}`}
                className="block px-4 py-2 text-foreground hover:text-brand hover:bg-gray-50"
              >
                {loc}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <SearchButton
        className="text-foreground hover:text-brand cursor-pointer"
        ariaLabel="Search"
      />
    </nav>
  );
}
