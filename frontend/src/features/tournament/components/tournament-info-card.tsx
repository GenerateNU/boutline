import CalendarTodayOutlined from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlined from "@mui/icons-material/LocationOnOutlined";
import PersonOutlined from "@mui/icons-material/PersonOutlined";

import { Card } from "@/components/primitives/card";
import { Label } from "@/components/primitives/label";
import { Text } from "@/components/primitives/text";

interface TournamentInfoCardProps {
  name: string;
  dates: string | null;
  location: string | null;
}

function TournamentInfoCard({ name, dates, location }: TournamentInfoCardProps) {
  return (
    <Card className="gap-2">
      <Text as="h1" variant="title" className="uppercase">
        {name}
      </Text>
      <Label icon={<CalendarTodayOutlined aria-hidden />}>{dates ?? "Dates TBC"}</Label>
      <Label icon={<LocationOnOutlined aria-hidden />}>{location ?? "Location TBC"}</Label>
      <Label icon={<PersonOutlined aria-hidden />}>Organizer contact TBC</Label>
    </Card>
  );
}

export { TournamentInfoCard };
