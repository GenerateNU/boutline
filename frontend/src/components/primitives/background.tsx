import Image from "next/image";

type BackgroundVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const backgrounds: Record<
  BackgroundVersion,
  { size: [number, number]; frame: string; pattern: string }
> = {
  1: { size: [700.463, 814.048], frame: "w-98 h-214.25", pattern: "left-41.25 top-109 rotate-[26.18deg]" },
  2: { size: [720.638, 1732.21], frame: "w-97.5 h-213.75", pattern: "left-48.75 top-107" },
  3: { size: [909.704, 1407.7], frame: "w-99 h-214.25", pattern: "left-12.25 top-102.75 -rotate-[12.32deg]" },
  4: { size: [802.078, 1019.43], frame: "w-99 h-214.25", pattern: "left-76 top-110.25" },
  5: { size: [534.257, 726.074], frame: "w-99 h-214.25", pattern: "left-49.5 top-144.25 rotate-[4.88deg]" },
  6: { size: [451.441, 1036.84], frame: "w-99 h-214.25", pattern: "left-33.75 top-102.75 rotate-[148.33deg]" },
  7: { size: [1341.62, 673.092], frame: "w-100.5 h-218.5", pattern: "left-53.25 top-79 -rotate-[107.16deg]" },
  8: { size: [1053.12, 522.801], frame: "w-100.5 h-218.5", pattern: "left-62 top-122.75 -rotate-[107.16deg]" },
};

interface BackgroundProps {
  version: BackgroundVersion;
}

function Background({ version }: BackgroundProps) {
  const { size, frame, pattern } = backgrounds[version];

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute top-0 left-1/2 -z-10 -translate-x-1/2 ${frame}`}
    >
      <Image
        src={`/brand/backgrounds/bg-${version}.svg`}
        alt=""
        width={size[0]}
        height={size[1]}
        className={`absolute max-w-none -translate-1/2 ${pattern}`}
      />
    </div>
  );
}

export { Background };
export type { BackgroundVersion };
