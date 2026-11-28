import { Card } from "@/components/primitives/card";
import { Skeleton } from "@/components/primitives/skeleton";
import { Text } from "@/components/primitives/text";

const FIELD_LABELS = [
  "Type of Event",
  "Date",
  "Time",
  "Weapon",
  "Gender Mix",
  "Age Category",
  "Event Format",
  "Rating Level",
];

export default function SettingsLoading() {
  return (
    <Card className="gap-4 rounded-[20px] p-5 font-manrope">
      <p role="status" className="sr-only">
        Loading event settings
      </p>
      <Text as="h2" variant="title">
        Event Information
      </Text>
      {FIELD_LABELS.map((label) => (
        <div key={label} aria-hidden className="flex flex-col gap-1">
          <Text variant="caption">{label}</Text>
          <Skeleton className="h-11" />
        </div>
      ))}
      <Skeleton className="h-10" />
    </Card>
  );
}
