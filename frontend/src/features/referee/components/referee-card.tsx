import { Button } from "@/components/primitives/button";
import { Card, CardTitle } from "@/components/primitives/card";
import { StatusBadge } from "@/components/primitives/status-badge";

interface Referee {
  id: string;
  name: string;
  occupied: boolean;
  pool?: string;
}

interface RefereeCardProps {
  referees: Referee[];
  onRemove?: (id: string) => void;
}

function RefereeCard({ referees, onRemove }: RefereeCardProps) {
  return (
    <Card className="gap-0 px-3.5 pt-3.5 pb-1">
      <CardTitle className="border-b border-outline pb-3 text-xl text-obsidian">
        Referees:
      </CardTitle>
      <ul className="divide-y divide-outline">
        {referees.map(({ id, name, occupied, pool }) => (
          <li key={id} className="flex items-center gap-3 py-3">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="truncate text-sm text-obsidian">{name}</p>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={occupied ? "occupied" : "available"} />
                {pool && <p className="text-xs font-medium text-obsidian">{pool}</p>}
              </div>
            </div>
            <Button variant="text" size="sm" className="min-w-20" onClick={() => onRemove?.(id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export { RefereeCard };
