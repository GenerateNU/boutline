import { Calendar, MapPin, User } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/primitives/card";

interface TournamentInfoCardProps {
  name: string;
  dates?: string | null;
}

function TournamentInfoCard({ name, dates }: TournamentInfoCardProps) {
  const infoRows = [
    { icon: Calendar, text: dates },
    { icon: MapPin, text: "Location - TBC" },
    { icon: User, text: "Organizer Contact - TBC" },
  ];

  return (
    <Card className="gap-2.5">
      <CardTitle role="heading" aria-level={1} className="text-xl text-obsidian uppercase">
        {name}
      </CardTitle>
      {infoRows.map(
        ({ icon: Icon, text }) =>
          text && (
            <CardDescription key={text} className="flex items-center gap-2 text-sm text-obsidian">
              <Icon aria-hidden className="size-4 shrink-0 text-neutral-secondary" />
              {text}
            </CardDescription>
          ),
      )}
    </Card>
  );
}

export { TournamentInfoCard };
