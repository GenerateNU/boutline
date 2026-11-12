"use client";

import Link from "next/link";
import CategoryOutlined from "@mui/icons-material/CategoryOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import MoreVertOutlined from "@mui/icons-material/MoreVertOutlined";
import ReplyOutlined from "@mui/icons-material/ReplyOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import SportsMartialArtsOutlined from "@mui/icons-material/SportsMartialArtsOutlined";

import { Avatar, AvatarFallback } from "@/components/primitives/avatar";
import { BackButton } from "@/components/primitives/back-button";
import { Button } from "@/components/primitives/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardMedia,
  CardTitle,
} from "@/components/primitives/card";
import { Checkbox } from "@/components/primitives/checkbox";
import { Chip } from "@/components/primitives/chip";
import { FilterButton } from "@/components/primitives/filter-button";
import { List, ListItem } from "@/components/primitives/list";
import { Menu, MenuItem } from "@/components/primitives/menu";
import { CircularProgress } from "@/components/primitives/circular-progress";
import { DatePicker } from "@/components/primitives/date-picker";
import { LinearProgress } from "@/components/primitives/linear-progress";
import { Loading } from "@/components/primitives/loading";
import { PinButton } from "@/components/primitives/pin-button";
import { Radio, RadioItem } from "@/components/primitives/radio";
import { RatingBadge } from "@/components/primitives/rating-badge";
import { Section } from "@/components/primitives/section";
import { SearchBar } from "@/components/primitives/search-bar";
import { SegmentItem } from "@/components/primitives/segment-item";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { Slider } from "@/components/primitives/slider";
import { Stat, StatRow } from "@/components/primitives/stat-row";
import { StatTile } from "@/components/primitives/stat-tile";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { Tag } from "@/components/primitives/tag";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { Toggle } from "@/components/primitives/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/primitives/tooltip";
import { EventListCard } from "@/app/tournaments/[tournamentId]/_components/event-list-card";
import { EventRow } from "@/app/tournaments/[tournamentId]/_components/event-row";
import { ClubCard } from "@/features/competitor/components/club-card";
import { FencerCard } from "@/features/competitor/components/fencer-card";
import { EventCard } from "@/features/event/components/event-card";
import type { TournamentEvent } from "@/features/event/types/event";
import { RefereeCard } from "@/features/referee/components/referee-card";
import { RefereeRow } from "@/features/referee/components/referee-row";
import { CreateTournamentCard } from "@/features/tournament/components/create-tournament-card";
import { TournamentCard } from "@/features/tournament/components/tournament-card";
import { TournamentInfoCard } from "@/features/tournament/components/tournament-info-card";
import { TournamentResultsCard } from "@/features/tournament/components/tournament-results-card";
import type { Tournament } from "@/features/tournament/types/tournament";
import { ProfileTopAppBar } from "@/components/primitives/profile-top-app-bar";
import { SubTopAppBar } from "@/components/primitives/sub-top-app-bar";

import { NavigationBar } from "@/components/primitives/navigation/navigation-bar";
import { NavigationDrawer } from "@/components/primitives/navigation/navigation-drawer";
import { NavigationDrawerItem } from "@/components/primitives/navigation/navigation-drawer-item";
import { NavigationItem } from "@/components/primitives/navigation/navigation-item";
import { Logo } from "@/components/primitives/logo";
import { Navbar } from "@/components/primitives/navigation/navbar";

const buttonVariantNames = ["filled", "outline", "tonal", "text"] as const;
const buttonSizes = ["sm", "default", "lg"] as const;

// Static stand-ins for each variant's hover fill, so the grid can show that state.
const hoverClasses: Record<(typeof buttonVariantNames)[number], string> = {
  filled: "bg-blue-dark",
  outline: "bg-blue-lighter",
  tonal: "bg-blue-light",
  text: "bg-blue-lighter",
};

const demoTournament: Tournament = {
  id: "demo",
  name: "Northeastern Open",
  visibility: "public",
  code: "DEMO01",
  status: "active",
  created_by: "demo",
  start_time: "2026-10-19T08:00:00Z",
  city: "Oakland",
  country: "US",
  started_at: null,
  completed_at: null,
  created_at: "2026-10-06T00:00:00Z",
  updated_at: "2026-10-06T00:00:00Z",
};
const demoResultsTournament: Tournament = {
  ...demoTournament,
  name: "Generate Fencing Open",
  status: "ended",
  city: "Boston",
};

const demoEvents: TournamentEvent[] = [
  ["Y-12 Men's Sabre", "08:00"],
  ["Cadet Men's Épée", "08:00"],
  ["Junior Women's Foil", "10:00"],
  ["Cadet Women's Épée", "10:00"],
].map(([name, time], index) => ({
  id: `demo-${index}`,
  tournament_id: "demo",
  format: "pool_then_direct_elimination",
  name,
  status: "active",
  start_time: `2026-10-19T${time}:00Z`,
  started_at: null,
  completed_at: null,
  created_at: "2026-10-06T00:00:00Z",
  updated_at: "2026-10-06T00:00:00Z",
}));

const demoReferees = [
  { id: "1", name: "Yan Wang", occupied: true, pool: "Pool 1" },
  { id: "2", name: "Yan Wang", occupied: false, pool: "Pool 1" },
];

const demoFencer = {
  id: "demo",
  eventId: "demo-event",
  tournamentId: "demo-tournament",
  ratingYear: 26,
  firstName: "Annika",
  lastName: "Kim",
  rating: "A26",
  team: "Boston Blade Club",
};
const demoClub = { name: "Boston Blade Club", competitorCount: 12 };

const barItems = ["Overview", "Fencers", "Clubs", "Events"].map((label) => ({
  label,
  href: "#",
  active: label === "Fencers",
}));

const drawerItems = Array.from({ length: 7 }, (_, index) => ({
  id: `drawer-${index}`,
  label: "Label",
  icon: <CategoryOutlined />,
  badge: "100+",
}));

const drawerFooter = [{ id: "settings", label: "Settings", icon: <SettingsOutlined /> }];
function DialogAvatar() {
  return (
    <Avatar className="size-8">
      <AvatarFallback className="text-xs">LA</AvatarFallback>
    </Avatar>
  );
}

function DialogList() {
  const dialogItems = Array.from({ length: 10 }, (_, index) => String(index));

  return (
    <List aria-label="Dialog options" className="min-h-0 overflow-y-auto">
      {dialogItems.map((value) => (
        <ListItem
          key={value}
          leading={<DialogAvatar />}
          trailing={
            <Checkbox
              defaultChecked={Number(value) < 2}
              aria-label={`Option ${value}`}
            />
          }
        >
          Dialog title
        </ListItem>
      ))}
    </List>
  );
}

export default function Home() {
  const { toast } = useToast();

  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Home Page">
        <div className="flex items-center gap-4">
          <p>This is the home page.</p>
          <p>quick links:</p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/login" className="text-primary underline">
                login
              </Link>
            </li>
            <li>
              <Link href="/tournaments" className="text-primary underline">
                Tournaments
              </Link>
            </li>
            <li>
              <Link href="/pinned" className="text-primary underline">
                Pinned
              </Link>
            </li>
          </ul>
        </div>
      </Section>

      <hr />

      <Section title="Button">
        <div className="grid grid-cols-3 items-center justify-items-start gap-x-3 gap-y-4">
          {buttonVariantNames.flatMap((variant) =>
            buttonSizes.map((size) => [
              <Button key={`${variant}-${size}`} variant={variant} size={size}>
                Button
              </Button>,
              <Button
                key={`${variant}-${size}-hover`}
                variant={variant}
                size={size}
                className={hoverClasses[variant]}
              >
                Button
              </Button>,
              <Button key={`${variant}-${size}-disabled`} variant={variant} size={size} disabled>
                Button
              </Button>,
            ]),
          )}
        </div>
      </Section>

      <Section title="Back Button">
        <div className="grid grid-cols-3 items-center justify-items-start gap-x-3 gap-y-4">
          {buttonSizes.map((size) => [
            <BackButton key={size} href="/" size={size} />,
            <BackButton key={`${size}-hover`} href="/" size={size} className="bg-blue-lighter" />,
            <BackButton key={`${size}-disabled`} href="/" size={size} disabled />,
          ])}
        </div>
      </Section>

      <Section title="Filter Button">
        <div className="flex flex-wrap items-center gap-3">
          <FilterButton aria-label="Filter" />
          <FilterButton aria-label="Filter" active />
          <FilterButton aria-label="Filter" disabled />
          <FilterButton aria-label="Filter" size="sm" />
          <FilterButton aria-label="Filter" size="sm" active />
          <FilterButton aria-label="Filter" size="sm" disabled />
        </div>
      </Section>

      <Section title="Pin Button">
        <div className="flex flex-wrap items-center gap-3">
          <PinButton aria-label="Pin" />
          <PinButton aria-label="Pin" active />
          <PinButton aria-label="Pin" variant="obsidian" />
          <PinButton aria-label="Pin" variant="primary" />
          <PinButton aria-label="Home" variant="primary">
            <HomeOutlined aria-hidden />
          </PinButton>
          <PinButton aria-label="Back" variant="primary">
            <ReplyOutlined aria-hidden />
          </PinButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PinButton aria-label="Pin" size="sm" />
          <PinButton aria-label="Pin" size="sm" variant="primary" />
        </div>
      </Section>

      <Section title="Avatar">
        <div className="flex items-center gap-4">
          <Avatar size="sm">
            <AvatarFallback />
          </Avatar>
          <Avatar size="md">
            <AvatarFallback />
          </Avatar>
          <Avatar>
            <AvatarFallback />
          </Avatar>
          <Avatar size="md">
            <AvatarFallback>EK</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>EK</AvatarFallback>
          </Avatar>
        </div>
      </Section>

      <Section title="Status Badge">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="in-progress" />
          <StatusBadge status="upcoming" />
          <StatusBadge status="completed" />
          <StatusBadge status="not-started" />
          <StatusBadge status="live" />
          <StatusBadge status="scheduled" />
          <StatusBadge status="occupied" />
          <StatusBadge status="available" />
        </div>
      </Section>

      <Section title="Rating Badge">
        <div className="flex flex-wrap items-center gap-3">
          <RatingBadge>A26</RatingBadge>
          <RatingBadge tone="subtle">A26</RatingBadge>
        </div>
      </Section>

      <Section title="Tag">
        <div className="flex flex-wrap items-center gap-3">
          <Tag icon={<SportsMartialArtsOutlined aria-hidden />}>Specialty: Foil</Tag>
        </div>
      </Section>

      <Section title="Stat Tile">
        <StatTile label="Pool" value="3" className="w-42.5" />
      </Section>

      <Section title="Stat Row">
        <StatRow>
          <Stat value="3-0" label="V-D" />
          <Stat value="1.00" label="V/M" />
          <Stat value="15" label="TS" />
          <Stat value="6" label="TR" />
          <Stat value="+9" label="Ind" />
        </StatRow>
        <StatRow>
          <Stat value="Final" label="Status" />
          <Stat value="1" label="Pool" />
          <Stat value="3" label="Strip" />
        </StatRow>
      </Section>

      <Section title="Cards">
        <div className="contents" onClickCapture={(event) => event.preventDefault()}>
          <TournamentCard tournament={demoTournament} />
          <TournamentCard tournament={{ ...demoTournament, status: "pending" }} admin />
          <EventCard event={{ ...demoEvents[0], name: "U15 Mixed Épée", status: "ended" }} competitorCount={5} />
          <TournamentResultsCard tournament={demoResultsTournament} eventCount={12} resultsHref="/" />
          <CreateTournamentCard />
          <TournamentInfoCard name="Boston Championships" dates="October 5 – October 7, 2026" />
          <EventRow event={demoEvents[0]} />
          <RefereeCard referees={demoReferees} />
          <EventListCard title="Ongoing Events" events={demoEvents} emptyMessage="" />
          <EventListCard
            title="Upcoming Events"
            events={demoEvents.map((event) => ({ ...event, status: "upcoming" }))}
            emptyMessage=""
          />
          <EventListCard
            title="Completed Events"
            events={demoEvents.map((event) => ({ ...event, status: "ended" }))}
            emptyMessage=""
          />
          <FencerCard competitor={demoFencer} />
          <FencerCard competitor={demoFencer} pinned={false} />
          <FencerCard competitor={demoFencer} pinned />
          <ClubCard team={demoClub} href="/" />
          <ClubCard team={demoClub} pinned={false} />
          <ClubCard team={demoClub} pinned />
          <RefereeRow name="Yan Wang" occupied pool="Pool 1" />
        </div>
      </Section>

      <Section title="Checkbox">
        <div className="flex items-center gap-4">
          <Checkbox defaultChecked aria-label="Checked" />
          <Checkbox checked="indeterminate" aria-label="Indeterminate" />
          <Checkbox aria-label="Unchecked" />
        </div>
      </Section>

      <Section title="Toggle">
        <div className="flex items-center gap-4">
          <Toggle aria-label="Off" />
          <Toggle defaultChecked aria-label="On" />
        </div>
      </Section>

      <Section title="Radio">
        <Radio defaultValue="one" aria-label="Radio">
          <RadioItem value="one" aria-label="One" />
          <RadioItem value="two" aria-label="Two" />
        </Radio>
      </Section>

      <Section title="Chip">
        <div className="flex flex-wrap items-center gap-3">
          <Chip>Label</Chip>
          <Chip icon={<MoreHorizOutlined />}>Label</Chip>
          <Chip dismissible>Label</Chip>
          <Chip dropdown>Label</Chip>
        </div>
      </Section>

      <Section title="Slider">
        <div className="flex flex-col gap-6">
          <Slider defaultValue={[0]} aria-label="Empty" />
          <Slider defaultValue={[50]} aria-label="Half" />
          <Slider defaultValue={[100]} aria-label="Full" />
        </div>
      </Section>

      <Section title="Segment items">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <SegmentItem position="start">Label</SegmentItem>
            <SegmentItem position="middle">Label</SegmentItem>
            <SegmentItem position="end">Label</SegmentItem>
          </div>
          <div className="flex items-center gap-3">
            <SegmentItem position="start" defaultPressed>
              Label
            </SegmentItem>
            <SegmentItem position="middle" defaultPressed>
              Label
            </SegmentItem>
            <SegmentItem position="end" defaultPressed>
              Label
            </SegmentItem>
          </div>
        </div>
      </Section>

      <Section title="Segmented buttons">
        <div className="flex flex-col items-start gap-4">
          {[2, 3, 4, 5].map((count) => (
            <SegmentedButton
              key={count}
              type="single"
              defaultValue="0"
              aria-label={`${count} segments`}
            >
              {Array.from({ length: count }, (_, index) => (
                <SegmentedButtonItem key={index} value={String(index)}>
                  Label
                </SegmentedButtonItem>
              ))}
            </SegmentedButton>
          ))}
        </div>
      </Section>

      <Section title="Tooltip">
        <div className="flex flex-col gap-20 py-10">
          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <Button variant="outline">Text tooltip</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Supporting text</TooltipContent>
          </Tooltip>

          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <Button variant="outline">Rich tooltip</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="flex flex-col gap-2 py-3">
              <p className="font-medium">Supporting text</p>
              <p className="text-background/70">
                A second line of detail for the richer variant.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section title="Date picker">
        <DatePicker />
      </Section>

      <Section title="Navigation item">
        <div className="flex rounded-xl bg-obsidian">
          <NavigationItem href="#" label="Fencers" />
          <NavigationItem href="#" label="Fencers" active />
        </div>
      </Section>

      <Section title="Logo">
        <div className="flex flex-col gap-4">
          <Logo />
          <div className="bg-blue p-4">
            <Logo className="text-white" />
          </div>
        </div>
      </Section>

      <Section title="Navbar">
        <Navbar />
      </Section>

      <Section title="Navigation drawer item">
        <div className="flex flex-col gap-2">
          <NavigationDrawerItem icon={<CategoryOutlined />} label="Label" badge="100+" />
          <NavigationDrawerItem
            icon={<CategoryOutlined />}
            label="Label"
            badge="100+"
            selected
          />
        </div>
      </Section>

      <Section title="Navigation bar">
        <NavigationBar aria-label="Sections" items={barItems.slice(0, 2)} />
        <NavigationBar aria-label="Sections" items={barItems} />
      </Section>

      <Section title="Navigation drawer">
        <NavigationDrawer
          title="Title"
          items={drawerItems}
          footerItems={drawerFooter}
          userName="User name"
          className="h-[950px]"
        />
      </Section>

      <Section title="Profile top app bar">
        <ProfileTopAppBar title="Profile" />
      </Section>

      <Section title="Sub top app bar">
        <SubTopAppBar
          title="Title"
          backHref="/"
          actions={
            <>
              <Button variant="text" size="icon" aria-label="Action">
                <CategoryOutlined />
              </Button>
              <Button variant="text" size="icon" aria-label="More options">
                <MoreVertOutlined />
              </Button>
            </>
          }
        />
      </Section>
      <Section title="List">
        <DialogList />
      </Section>

      <Section title="Menu">
        <Menu>
          {Array.from({ length: 10 }, (_, index) => (
            <MenuItem key={index} icon={<MoreHorizOutlined aria-hidden />}>
              Dialog title
            </MenuItem>
          ))}
        </Menu>
      </Section>

      <Section title="Search bar">
        <div className="flex flex-col gap-6">
          <SearchBar
            placeholder="Enter search text"
            aria-label="Search"
            trailing={
              <Avatar className="size-8">
                <AvatarFallback />
              </Avatar>
            }
          />

          <SearchBar expanded defaultValue="Input" aria-label="Search">
            <div className="h-24" />
          </SearchBar>

          <SearchBar expanded defaultValue="Input" aria-label="Search">
            <List className="border-0">
              {Array.from({ length: 4 }, (_, index) => (
                <ListItem key={index} leading={<DialogAvatar />}>
                  Dialog title
                </ListItem>
              ))}
            </List>
          </SearchBar>
        </div>
      </Section>

      <Section title="Linear progress">
        <div className="flex flex-col gap-6">
          {[25, 50, 75, 100].map((value) => (
            <LinearProgress key={value} value={value} aria-label={`${value}%`} />
          ))}
        </div>
      </Section>

      <Section title="Circular progress">
        <div className="flex items-center gap-4">
          {[25, 50, 75, 100].map((value) => (
            <CircularProgress
              key={value}
              value={value}
              aria-label={`${value}%`}
            />
          ))}
        </div>
      </Section>

      <Section title="Loading">
        <Loading />
      </Section>

      <Section title="Card">
        <div className="flex flex-col gap-4">
          <Card className="w-64">
            <CardMedia />
            <CardHeader>
              <CardTitle>Header</CardTitle>
              <CardDescription>Subhead</CardDescription>
              <CardAction>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="More"
                  className="bg-background"
                >
                  <MoreHorizOutlined />
                </Button>
              </CardAction>
            </CardHeader>
          </Card>
          <Card orientation="horizontal">
            <CardMedia />
            <CardHeader>
              <CardTitle>Header</CardTitle>
              <CardDescription>Subhead</CardDescription>
              <CardAction>
                <Button variant="outline" size="icon" aria-label="More">
                  <MoreHorizOutlined />
                </Button>
              </CardAction>
            </CardHeader>
          </Card>
        </div>
      </Section>

      <Section title="Toast">
        <Button
          onClick={() =>
            toast({
              description:
                "Toasts provide brief messages about app processes at the bottom of the screen",
              action: { label: "Label", altText: "Label" },
              stacked: true,
            })
          }
        >
          Show toast
        </Button>
      </Section>

      <Section title="Tabs">
        <div className="flex flex-col gap-8">
          {(["stacked", "line"] as const).map((variant) => (
            <Tabs key={variant} defaultValue="one">
              <TabsList variant={variant}>
                {["one", "two", "three"].map((value) => (
                  <TabsTrigger key={value} value={value} icon={<MoreHorizOutlined />}>
                    Tab
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ))}
        </div>
      </Section>

      <Section title="Textfield">
        <div className="flex flex-col gap-6">
          <TextField
            label="Label"
            placeholder="Placeholder text"
            supportingText="Supporting text"
            leading={<MoreHorizOutlined aria-hidden />}
            trailing={<MoreHorizOutlined aria-hidden />}
          />
        </div>
      </Section>
    </main>
  );
}