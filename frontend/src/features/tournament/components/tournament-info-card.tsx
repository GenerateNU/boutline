import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";

import { Card, CardDescription, CardTitle } from "@/components/primitives/card";

interface TournamentInfoCardProps {
  name: string;
  dates?: string | null;
}

function TournamentInfoCard({ name, dates }: TournamentInfoCardProps) {
  const infoRows = [
    { icon: CalendarTodayOutlined, text: dates },
    { icon: LocationOnOutlined, text: "Location - TBC" },
    { icon: PersonOutlined, text: "Organizer Contact - TBC" },
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
