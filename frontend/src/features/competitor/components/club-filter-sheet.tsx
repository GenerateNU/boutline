"use client";

import { useState } from "react";

import { ChipGroup, ChipGroupOptions } from "@/components/primitives/chip-group";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { Text } from "@/components/primitives/text";
import { WEAPON_OPTIONS } from "@/features/event/lib/event-filters";

const PLACEHOLDER_SEARCHES = ["Fencer", "Club"];

// The Clubs tab's filter sheet. The clubs API only searches by name, so every
// section is a disabled placeholder and there is nothing to apply or reset.
function ClubFilterSheet() {
  const [open, setOpen] = useState(false);

  return (
    <FilterSheetDialog
      open={open}
      onOpenChange={setOpen}
      triggerLabel="Filter clubs"
      description="Narrow the club list"
      submitLabel="Show Clubs"
      onReset={() => {}}
      onSubmit={() => setOpen(false)}
    >
      <Text variant="caption">Greyed-out filters are coming soon.</Text>

      {PLACEHOLDER_SEARCHES.map((label) => (
        <FilterSearchField
          key={label}
          label={label}
          disabled
          suggestions={null}
          failed={false}
          selected=""
          onPick={() => {}}
          noun={`${label.toLowerCase()}s`}
        />
      ))}

      <ChipGroup label="Weapon" disabled>
        <ChipGroupOptions options={WEAPON_OPTIONS} />
      </ChipGroup>
    </FilterSheetDialog>
  );
}

export { ClubFilterSheet };
