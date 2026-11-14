import { Card } from "@/components/primitives/card";

import { TournamentDraft } from "../_types/tournament-draft";
import { RequiredTournamentField } from "../tournament-draft-helpers";
import { TournamentDraftFields } from "./tournament-draft-fields";
import { TournamentDraftSummary } from "./tournament-draft-summary";

interface TournamentDetailsCardProps {
  draft: TournamentDraft;
  onField: (field: RequiredTournamentField, value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}

function TournamentDetailsCard({ draft, onField, onEdit, onSave, saving, error }: TournamentDetailsCardProps) {
  return (
    <Card role="group" aria-label="Tournament details" className="gap-4 shadow-none">
      <h2 className="text-base font-semibold text-obsidian">Tournament details</h2>
      {draft.saved ? (
        <TournamentDraftSummary draft={draft} onEdit={onEdit} />
      ) : (
        <TournamentDraftFields draft={draft} onField={onField} onSave={onSave} saving={saving} error={error} />
      )}
    </Card>
  );
}

export { TournamentDetailsCard };
