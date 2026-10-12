import { Section } from "@/components/primitives/section";

export default function EventsTab() {
  return (
    <Section title="Events Tab" className="flex flex-col gap-4">
      <p>This is the events tab.</p>
      <p>lists of events in this tournament</p>
      <p>
        they should also be able to search / filter for events here, and see
        which events are past, live, and upcoming. We should also be able to support
        calendar view
      </p>
    </Section>
  );
}
