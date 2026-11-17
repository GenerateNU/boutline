import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";

import { Card } from "@/components/primitives/card";
import { Label } from "@/components/primitives/label";

interface TournamentInfoCardProps {
  dates: string | null;
  location: string | null;
}

function TournamentInfoCard({ dates, location }: TournamentInfoCardProps) {
  return (
    <Card className="gap-2">
      <Label icon={<CalendarTodayOutlined aria-hidden />}>{dates ?? "Dates TBC"}</Label>
      <Label icon={<LocationOnOutlined aria-hidden />}>{location ?? "Location TBC"}</Label>
      <Label icon={<PersonOutlined aria-hidden />}>Organizer contact TBC</Label>
    </Card>
  );
}

export { TournamentInfoCard };
