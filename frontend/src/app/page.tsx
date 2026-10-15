"use client";

import { Ellipsis } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/primitives/avatar";
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
import { List, ListItem } from "@/components/primitives/list";
import { Menu, MenuItem } from "@/components/primitives/menu";
import { CircularProgress } from "@/components/primitives/circular-progress";
import { Radio, RadioItem } from "@/components/primitives/radio";
import { SearchBar } from "@/components/primitives/search-bar";
import { SegmentItem } from "@/components/primitives/segment-item";
import {
  SegmentedButton,
  SegmentedButtonItem,
} from "@/components/primitives/segmented-button";
import { Slider } from "@/components/primitives/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/primitives/tabs";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { Toggle } from "@/components/primitives/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/primitives/tooltip";
import { LinearProgress } from "@/components/primitives/linear-progress";
import { Section } from "@/components/primitives/section";
import Link from "next/link";

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
          </ul>
        </div>
      </Section>

      <hr />

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

      <Section title="List">
        <DialogList />
      </Section>

      <Section title="Menu">
        <Menu>
          {Array.from({ length: 10 }, (_, index) => (
            <MenuItem key={index} icon={<Ellipsis aria-hidden />}>
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
                  <Ellipsis />
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
                  <Ellipsis />
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
                  <TabsTrigger key={value} value={value} icon={<Ellipsis />}>
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
            leading={<Ellipsis aria-hidden />}
            trailing={<Ellipsis aria-hidden />}
          />
        </div>
      </Section>
    </main>
  );
}
