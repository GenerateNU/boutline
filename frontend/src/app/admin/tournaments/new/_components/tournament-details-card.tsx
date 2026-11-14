import { Card } from "@/components/primitives/card";

import { TournamentDraft } from "../_types/tournament-draft";
import { RequiredTournamentField } from "../tournament-draft-helpers";
import { TournamentDraftFields } from "./tournament-draft-fields";
import { TournamentDraftSummary } from "./tournament-draft-summary";

interface TournamentDetailsCardProps {
  draft: TournamentDraft;
  onField: (field: RequiredTournamentField, value: string) => void;
  onSavedChange: (saved: boolean) => void;
}

function TournamentDetailsCard({ draft, onField, onSavedChange }: TournamentDetailsCardProps) {
  return (
    <Card role="group" aria-label="Tournament details" className="gap-4 shadow-none">
      <h2 className="text-base font-semibold text-obsidian">Tournament details</h2>
      {draft.saved ? (
        <TournamentDraftSummary draft={draft} onEdit={() => onSavedChange(false)} />
      ) : (
        <TournamentDraftFields draft={draft} onField={onField} onSave={() => onSavedChange(true)} />
      )}
    </Card>
  );
}

export { TournamentDetailsCard };
