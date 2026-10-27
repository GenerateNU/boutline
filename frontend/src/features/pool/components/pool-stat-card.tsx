import { Card } from "@/components/primitives/card";

interface PoolStatCardProps {
  label: string;
  value: string;
}

function PoolStatCard({ label, value }: PoolStatCardProps) {
  return (
    <Card className="flex-1 gap-0 rounded-md px-2 py-1.5">
      <p className="text-xs uppercase">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  );
}

export { PoolStatCard };
