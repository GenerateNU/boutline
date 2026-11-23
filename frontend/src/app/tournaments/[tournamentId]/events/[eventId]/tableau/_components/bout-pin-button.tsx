import PushPin from "@mui/icons-material/PushPin";
import PushPinOutlined from "@mui/icons-material/PushPinOutlined";
import { cn } from "cn";

import { PinButton } from "@/components/primitives/pin-button";

interface BoutPinButtonProps extends React.ComponentProps<typeof PinButton> {
  pinned: boolean;
}

function BoutPinButton({ pinned, className, ...props }: BoutPinButtonProps) {
  const PinIcon = pinned ? PushPin : PushPinOutlined;
  return (
    <div className="pointer-events-none absolute inset-x-3 top-3 flex h-5 items-center justify-end">
      <PinButton
        variant="plain"
        size="xs"
        active={pinned}
        aria-label={pinned ? "Unpin bout" : "Pin bout"}
        className={cn("pointer-events-auto -mr-1.5 [&_svg]:size-5", className)}
        {...props}
      >
        <PinIcon aria-hidden />
      </PinButton>
    </div>
  );
}

export { BoutPinButton };
