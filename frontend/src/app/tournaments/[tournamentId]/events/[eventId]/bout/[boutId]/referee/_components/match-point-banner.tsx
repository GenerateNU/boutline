interface MatchPointBannerProps {
  names: string[];
}

export function MatchPointBanner({ names }: MatchPointBannerProps) {
  return (
    <div
      role="status"
      aria-label="Match point"
      className="flex flex-col items-center gap-1 rounded-xl bg-primary px-4 py-3 text-center text-primary-foreground motion-safe:animate-pulse"
    >
      <p className="text-2xl font-medium tracking-wide uppercase">Match point</p>
      <p className="text-sm">{names.join(" and ")}</p>
    </div>
  );
}
