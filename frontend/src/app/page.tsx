import { LandingHero } from "./_components/landing-hero";
import { PoolsFeature } from "./_components/pools-feature";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col font-manrope">
      <LandingHero />
      <PoolsFeature />
    </main>
  );
}
