import { Ellipsis, EllipsisVertical, Settings, Shapes } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
import { DatePicker } from "@/components/primitives/date-picker";
import { Checkbox } from "@/components/primitives/checkbox";
import { Chip } from "@/components/primitives/chip";
import { Radio, RadioItem } from "@/components/primitives/radio";
import { SegmentItem } from "@/components/primitives/segment-item";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { Slider } from "@/components/primitives/slider";
import { Toggle } from "@/components/primitives/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/primitives/tooltip";
import { Section } from "@/components/primitives/section";
import { ProfileTopAppBar } from "@/components/primitives/profile-top-app-bar";
import { SubTopAppBar } from "@/components/primitives/sub-top-app-bar";

import { NavigationBar } from "@/components/primitives/navigation/navigation-bar";
import { NavigationDrawer } from "@/components/primitives/navigation/navigation-drawer";
import { NavigationItem } from "@/components/primitives/navigation/navigation-item";
import { NavigationDrawerItem } from "@/components/primitives/navigation/navigation-drawer-item";

const barItems = Array.from({ length: 5 }, (_, index) => ({
  id: `bar-${index}`,
  label: "Label",
  icon: <Shapes />,
}));

const drawerItems = Array.from({ length: 7 }, (_, index) => ({
  id: `drawer-${index}`,
  label: "Label",
  icon: <Shapes />,
  badge: "100+",
}));

const drawerFooter = [{ id: "settings", label: "Settings", icon: <Settings /> }];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <Section title="Avatar">
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback />
          </Avatar>
          <Avatar>
            <AvatarFallback>LA</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>
              <span className="size-5 rounded-full bg-muted-foreground/50" />
            </AvatarFallback>
          </Avatar>
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="filled">Label</Button>
          <Button variant="text">Label</Button>
          <Button variant="outline" size="icon" aria-label="More">
            <Ellipsis />
          </Button>
          <Button variant="outline">Label</Button>
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
          <Chip icon={<Ellipsis />}>Label</Chip>
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
        <div className="flex items-center gap-4">
          <NavigationItem icon={<Shapes />} label="Label" />
          <NavigationItem icon={<Shapes />} aria-label="Label" />
          <NavigationItem icon={<Shapes />} label="Label" selected />
          <NavigationItem icon={<Shapes />} aria-label="Label" selected />
        </div>
      </Section>

      <Section title="Navigation drawer item">
        <div className="flex flex-col gap-2">
          <NavigationDrawerItem icon={<Shapes />} label="Label" badge="100+" />
          <NavigationDrawerItem icon={<Shapes />} label="Label" badge="100+" selected />
        </div>
      </Section>

      <Section title="Navigation bar">
        <NavigationBar items={barItems} />
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
                <Shapes />
              </Button>
              <Button variant="text" size="icon" aria-label="More options">
                <EllipsisVertical />
              </Button>
            </>
          }
        />
      </Section>
    </main>
  );
}
