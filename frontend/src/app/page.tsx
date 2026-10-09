import { Ellipsis } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/primitives/avatar";
import { Button } from "@/components/primitives/button";
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const segmentCounts = [2, 3, 4, 5];

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
          {segmentCounts.map((count) => (
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
              <span className="font-medium">Supporting text</span>
              <span className="text-background/70">
                A second line of detail for the richer variant.
              </span>
            </TooltipContent>
          </Tooltip>
        </div>
      </Section>
    </main>
  );
}
