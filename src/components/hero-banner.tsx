import Image from "next/image";
import Link from "next/link";

export function HeroBanner() {
  return (
    <div className="hidden md:block relative -mt-8 left-1/2 -translate-x-1/2 w-screen overflow-hidden">
      <Image
        src="https://pub-7aa6c67ec9294828987ab42d35f61c0f.r2.dev/uploads/static/home_cover.webp"
        alt="Mountain landscape"
        width={1400}
        height={450}
        priority
        className="w-full h-[450px] object-cover"
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Link href="/" className="flex items-center gap-4">
          <Image src="/logo.png" alt="Hippo Hamster" width={120} height={120} unoptimized />
          <span className="text-6xl font-bold text-white drop-shadow-lg">
            Hippo
            <br />
            Hamster
          </span>
          <div className="self-stretch w-[2px] bg-white/60" />
          <span className="text-4xl font-bold text-white/90 tracking-wide drop-shadow-lg">
            Washington Alpine Adventures
          </span>
        </Link>
      </div>
    </div>
  );
}
