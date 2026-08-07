import Image from "next/image";
import { HeroBanner } from "@/components/hero-banner";
import { NavBar } from "@/components/nav-bar";

export const metadata = {
  title: "About",
  description:
    "Meet Siyi (Hippo) and Chutang (Hamster) — PNW climbers sharing detailed route beta and trip reports from the Washington Cascades.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div>
      <HeroBanner />
      <NavBar />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="md:grid md:grid-cols-[1fr_auto] md:gap-8 md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-brand-grey text-center mb-6">About Us</h1>
            <article className="prose dark:prose-invert max-w-none text-black dark:text-white">
              <p>Welcome to Siyi🦛 (Hippo) and Chutang🐹 (Hamster)&rsquo;s alpine adventures!</p>
              <h3>Why Hippo🦛 and Hamster🐹?</h3>
              <p>Siyi is the Hippo 🦛 because he drinks milk tea really, really fast. One gulp and it&rsquo;s gone, like a hippo opening its giant mouth.</p>
              <p>Chutang is the Hamster 🐹 because she always overpacks her food, stuffing away snacks for every trip like a hamster filling its cheeks.</p>
              <h3>Start of Our Journey</h3>
              <p>We moved to the Seattle area at the beginning of 2021 and started hiking and backpacking around the PNW. With the goal of climbing Mount Rainier unguided, we applied for the Mountaineers basic climbing course in 2022. Got rejected lol. So we both took the scramble course in 2022 instead, then basic climbing in 2024, lead on trad in 2025, and winter mountaineering and crevasse rescue in 2026. </p>
              <p>Somewhere along the way we fell in love with the Cascades, from hiking to backpacking, from rock to glacier, and just gradually became outdoor people.</p>
              <h3>Our Website</h3>
              <p>You&rsquo;ll find detailed, photo heavy route beta here. We try to provide the best beta for every route we take. There are trip reports out there, but we like to illustrate the crux with actual photos so you can go in with more confidence! Our peaks and routes mostly cover popular lists like the Bulger List and Smoot List.</p>
              <p>Thanks for reading! Hope you&rsquo;re also enjoying the mountains!</p>
            </article>
          </div>
          <figure className="mt-6 md:mt-0 md:w-[300px]">
            <Image
              src={`${process.env.R2_PUBLIC_URL}/uploads/static/about_us.webp`}
              alt="Siyi and Chutang"
              width={300}
              height={400}
              className="w-full rounded-xl object-cover"
            />
            <figcaption className="text-sm text-muted-foreground text-center mt-2">Siyi and Chutang at SEWS, Washington Pass 2025</figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}
