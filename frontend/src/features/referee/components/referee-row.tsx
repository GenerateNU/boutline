import { Button } from "@/components/primitives/button";
import { Card, CardHeader, CardTitle } from "@/components/primitives/card";
import { StatusBadge } from "@/components/primitives/status-badge";

interface RefereeRowProps {
  name: string;
  occupied: boolean;
  pool?: string;
  onRemove?: () => void;
}

function RefereeRow({ name, occupied, pool, onRemove }: RefereeRowProps) {
  return (
    <Card orientation="horizontal" className="gap-3 p-3.5">
      <CardHeader>
        <CardTitle className="text-sm text-obsidian uppercase">{name}</CardTitle>
        <div className="flex items-center gap-2">
          <StatusBadge status={occupied ? "occupied" : "available"} />
          {pool && <p className="text-xs text-neutral-secondary">{pool}</p>}
        </div>
      </CardHeader>
      <Button variant="outline" size="sm" className="min-w-20" onClick={onRemove}>
        Remove
      </Button>
    </Card>
  );
}

export { RefereeRow };
