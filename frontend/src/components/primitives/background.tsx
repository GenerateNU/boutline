import Image from "next/image";

import { cn } from "cn";

type BackgroundVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const backgrounds: Record<
  BackgroundVersion,
  { frame: [number, number]; size: [number, number]; center: [number, number]; rotate: number }
> = {
  1: { frame: [392, 857], size: [700.463, 814.048], center: [165.3, 436.2], rotate: 26.18 },
  2: { frame: [390, 855], size: [720.638, 1732.21], center: [195.3, 428.4], rotate: 0 },
  3: { frame: [396, 857], size: [909.704, 1407.7], center: [49.4, 411.1], rotate: -12.32 },
  4: { frame: [396, 857], size: [802.078, 1019.43], center: [303.9, 440.8], rotate: 0 },
  5: { frame: [396, 857], size: [534.257, 726.074], center: [197.8, 577.4], rotate: 4.88 },
  6: { frame: [396, 857], size: [451.441, 1036.84], center: [135.1, 410.5], rotate: 148.33 },
  7: { frame: [402, 874], size: [1341.62, 673.092], center: [213.0, 315.8], rotate: -107.16 },
  8: { frame: [402, 874], size: [1053.12, 522.801], center: [247.7, 490.7], rotate: -107.16 },
};

interface BackgroundProps {
  version: BackgroundVersion;
  className?: string;
}

function Background({ version, className }: BackgroundProps) {
  const { frame, size, center, rotate } = backgrounds[version];

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute top-0 left-1/2 -z-10 -translate-x-1/2", className)}
      style={{ width: frame[0], height: frame[1] }}
    >
      <Image
        src={`/brand/backgrounds/bg-${version}.svg`}
        alt=""
        width={size[0]}
        height={size[1]}
        className="absolute max-w-none"
        style={{
          left: center[0],
          top: center[1],
          transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        }}
      />
    </div>
  );
}

export { Background };
export type { BackgroundVersion };
