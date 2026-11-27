import { Button } from "@/components/primitives/button";

interface SelectionBarProps {
  count: number;
  onClear: () => void;
  // The actions for what's selected, as outline Buttons.
  children: React.ReactNode;
}

// Floats over the bottom of the screen while edit mode has a selection, so its
// actions stay in reach however long the list is.
function SelectionBar({ count, onClear, children }: SelectionBarProps) {
  return (
    <div
      role="region"
      aria-label="Selection"
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-mobile flex-col gap-3 rounded-xl bg-blue p-4 text-white shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{count} selected</p>
        <Button type="button" variant="text" size="sm" className="-mr-3 text-white hover:bg-blue-dark" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="flex gap-3 [&>*]:flex-1">{children}</div>
    </div>
  );
}

export { SelectionBar };
