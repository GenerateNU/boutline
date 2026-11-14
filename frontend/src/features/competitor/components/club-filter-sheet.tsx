"use client";

import { useState } from "react";

import { ChipGroup } from "@/components/primitives/chip-group";
import { ComingSoonNote } from "@/components/primitives/coming-soon-note";
import { FilterSearchField } from "@/components/primitives/filter-search-field";
import { FilterSheetDialog } from "@/components/primitives/filter-sheet-dialog";
import { WEAPON_OPTIONS } from "@/features/competitor/lib/placeholder-filter-options";

// Every section is a disabled placeholder, so there is nothing to apply or reset.
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
      <ComingSoonNote />

      {["Fencer", "Club"].map((label) => (
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

      <ChipGroup label="Weapon" options={WEAPON_OPTIONS} disabled />
    </FilterSheetDialog>
  );
}

export { ClubFilterSheet };
