"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { ChipGroup, ChipGroupItem } from "@/components/primitives/chip-group";
import { Modal, ModalFooter } from "@/components/primitives/modal";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { fencerProfileBody } from "@/features/competitor/lib/fencer-profile-body";
import { apiRequest } from "@/services/api-request";
import type { Competitor } from "@/types/competitor";
import { errorMessage } from "@/utils/error-message";

import { EMD_FORM_FIELDS } from "../../_components/emd-form-fields";
import { CHECK_IN_OPTIONS } from "../_lib/check-in-filter";
import { NO_RATING, RATING_CHOICES } from "../_lib/rating-choices";

// A fencer always has a rating, so None isn't offered here.
const RATINGS = RATING_CHOICES.filter(({ value }) => value !== NO_RATING);

interface EditFencerFormProps {
  competitor: Competitor;
  onClose: () => void;
}

function EditFencerForm({ competitor, onClose }: EditFencerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(competitor.firstName);
  const [lastName, setLastName] = useState(competitor.lastName);
  const [club, setClub] = useState(competitor.team);
  // "true" is present; the same values as the list filter.
  const wasCheckedIn = String(competitor.checkedInAt !== null);
  const [checkedIn, setCheckedIn] = useState(wasCheckedIn);
  const [rating, setRating] = useState(competitor.rating);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await apiRequest(`/competitors/${encodeURIComponent(competitor.id)}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...fencerProfileBody({ firstName, lastName, club }),
            rating,
            // Sent only on a change, since checking in again would move the check-in time.
            ...(checkedIn !== wasCheckedIn && { checkedIn: checkedIn === "true" }),
          }),
        });
        toast({ description: "Fencer updated" });
        router.refresh();
        onClose();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={EMD_FORM_FIELDS}>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <TextField label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      {/* Radix reports "" when the chosen option is clicked again; keep the current choice. */}
      <ChipGroup label="Check in Status" value={checkedIn} onValueChange={(value) => value && setCheckedIn(value)}>
        {CHECK_IN_OPTIONS.map(({ value, label }) => (
          <ChipGroupItem key={value} value={value} className="flex-1">
            {label}
          </ChipGroupItem>
        ))}
      </ChipGroup>
      <TextField label="Club" value={club} onChange={(e) => setClub(e.target.value)} />
      <SelectField label="Rating" name="rating" options={RATINGS} value={rating} onValueChange={setRating} />
      <ModalFooter>
        <Button type="submit" disabled={pending || !firstName.trim() || !lastName.trim()}>
          Confirm edits
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </form>
  );
}

interface EditFencerDialogProps {
  competitor: Competitor | null;
  onOpenChange: (open: boolean) => void;
}

function EditFencerDialog({ competitor, onOpenChange }: EditFencerDialogProps) {
  return (
    <Modal open={competitor !== null} onOpenChange={onOpenChange} title="Edit Fencer Information">
      {competitor && (
        <EditFencerForm key={competitor.id} competitor={competitor} onClose={() => onOpenChange(false)} />
      )}
    </Modal>
  );
}

export { EditFencerDialog };
