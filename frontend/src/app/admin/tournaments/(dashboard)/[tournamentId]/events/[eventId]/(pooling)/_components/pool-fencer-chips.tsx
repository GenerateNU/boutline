import AddOutlined from "@mui/icons-material/AddOutlined";

import { Chip } from "@/components/primitives/chip";

interface PickedFencer {
  id: string;
  name: string;
}

interface PoolFencerChipsProps {
  fencers: PickedFencer[];
  onRemove: (id: string) => void;
  onAdd: () => void;
}

function PoolFencerChips({ fencers, onRemove, onAdd }: PoolFencerChipsProps) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-2">
      {fencers.map(({ id, name }) => (
        <Chip
          key={id}
          onDismiss={() => onRemove(id)}
          dismissLabel={`Remove ${name}`}
          className="gap-2.5 rounded-full border-transparent bg-blue-lighter px-2 font-normal text-blue-dark shadow-none hover:bg-blue-light"
        >
          {name}
        </Chip>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex cursor-pointer items-center gap-0.5 rounded-full bg-blue-dark px-2 py-1 text-xs text-blue-lightest outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5"
      >
        <AddOutlined aria-hidden />
        Add fencer
      </button>
    </div>
  );
}

export { PoolFencerChips };
export type { PickedFencer };
