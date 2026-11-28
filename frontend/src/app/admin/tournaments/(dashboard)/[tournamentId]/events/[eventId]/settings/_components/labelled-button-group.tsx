import { ButtonGroup } from "@/components/primitives/button-group";
import { Text } from "@/components/primitives/text";

interface LabelledButtonGroupProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
}

export function LabelledButtonGroup({
  label,
  ...props
}: LabelledButtonGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <Text>{label}</Text>
      <ButtonGroup aria-label={label} {...props} />
    </div>
  );
}
