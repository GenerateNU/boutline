import { Text } from "@/components/primitives/text";
import type { FencerBout } from "@/features/pinning/types/fencer-bout";

function resultLabel({ status, score }: FencerBout) {
  if (status === "upcoming" || !score) {
    return "Upcoming";
  }
  const result = `${score[0]}–${score[1]}`;
  return status === "active" ? `${result} · In Progress` : result;
}

function FencerBoutList({ bouts }: { bouts: FencerBout[] }) {
  if (bouts.length === 0) {
    return null;
  }
  return (
    <ul aria-label="Bouts" className="flex flex-col gap-1 pl-4">
      {bouts.map((bout) => (
        <li key={bout.id} className="flex items-center justify-between gap-4">
          <Text variant="caption">{`${bout.stage} · vs ${bout.opponent}`}</Text>
          <Text variant="caption">{resultLabel(bout)}</Text>
        </li>
      ))}
    </ul>
  );
}

export { FencerBoutList };
