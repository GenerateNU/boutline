import { Text } from "@/components/primitives/text";

interface EventTitleProps {
  name: string;
}

// One line, so the tableau's fixed height offset (12.5rem) holds for long names.
function EventTitle({ name }: EventTitleProps) {
  return (
    <Text as="h1" variant="heading" className="truncate font-manrope">
      {name}
    </Text>
  );
}

export { EventTitle };
