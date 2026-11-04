import { Button } from "@/components/primitives/button";
import type { Team } from "@/types/competitor";

interface ClubOptionsProps {
  clubs: Team[] | null;
  failed: boolean;
  selectedClub: string;
  onToggleClub: (name: string) => void;
}

function ClubOptions({ clubs, failed, selectedClub, onToggleClub }: ClubOptionsProps) {
  if (failed) {
    return <p className="text-sm text-muted-foreground">Couldn’t load clubs.</p>;
  }
  // null until the first search answers, so nothing flashes "No clubs match."
  if (clubs === null) {
    return null;
  }
  if (clubs.length === 0) {
    return <p className="text-sm text-muted-foreground">No clubs match.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2 pt-1">
      {clubs.map(({ name }) => (
        <li key={name}>
          <Button
            type="button"
            variant="outline"
            aria-pressed={name === selectedClub}
            onClick={() => onToggleClub(name)}
            className="h-auto rounded-sm border-brand px-3.5 py-1.5 font-normal text-brand aria-pressed:bg-brand aria-pressed:text-background"
          >
            {name}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export { ClubOptions };
