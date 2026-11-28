"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { ImportDropzone } from "@/components/primitives/import-dropzone";
import { SelectField } from "@/components/primitives/select-field";
import { Sheet } from "@/components/primitives/sheet";
import { TextField } from "@/components/primitives/text-field";
import { useToast } from "@/components/primitives/toast";
import { GENDER_OPTIONS } from "@/features/competitor/lib/fencer-filters";
import { fencerProfileBody } from "@/features/competitor/lib/fencer-profile-body";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

import { EMD_FORM_FIELDS } from "../../_components/emd-form-fields";
import { NO_RATING, RATING_CHOICES } from "../_lib/rating-choices";
import { importFencers } from "../_services/import-fencers";

const CSV_ACCEPT = { "text/csv": [".csv"] };

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  gender: "",
  birthdate: "",
  division: "",
  club: "",
  rating: "",
};

interface AddFencerSheetProps {
  eventId: string;
}

function AddFencerSheet({ eventId }: AddFencerSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pending, startTransition] = useTransition();

  const complete = Boolean(
    form.firstName.trim() && form.lastName.trim() && form.gender && form.birthdate && form.division.trim(),
  );

  function field(name: keyof typeof EMPTY_FORM) {
    return {
      value: form[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [name]: event.target.value }),
    };
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await apiRequest("/competitors", {
          method: "POST",
          body: JSON.stringify({
            eventId,
            ...fencerProfileBody(form),
            gender: form.gender,
            birthdate: form.birthdate,
            division: form.division.trim(),
            // No rating picked is sent as unrated.
            rating: !form.rating || form.rating === NO_RATING ? "U" : form.rating,
          }),
        });
        toast({ description: "Fencer added" });
        router.refresh();
        setForm(EMPTY_FORM);
        setOpen(false);
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  function handleFile(file: File) {
    startTransition(async () => {
      try {
        const { added, skipped } = await importFencers(file, eventId);
        const skippedNote = skipped > 0 ? ` Skipped ${skipped} invalid or duplicate rows.` : "";
        toast({ description: `Added ${added} fencers from ${file.name}.${skippedNote}` });
        setOpen(false);
      } catch (err) {
        toast({ description: errorMessage(err) });
      } finally {
        router.refresh();
      }
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title="Add Fencers"
      description="Enter a fencer in this event."
      trigger={
        <Button size="sm">
          Add Fencers
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className={EMD_FORM_FIELDS}>
        <ImportDropzone
          accept={CSV_ACCEPT}
          title="Already have fencer info?"
          hint=".csv files only"
          onFile={handleFile}
          onReject={(message) => toast({ description: message })}
          className="rounded-[20px] border-2 border-blue-light"
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="First name" placeholder="ex. JOHN" required {...field("firstName")} />
          <TextField label="Last name" placeholder="ex. DOE" required {...field("lastName")} />
        </div>
        <TextField label="Club" placeholder="ex. BOSTON BLADE CLUB" {...field("club")} />
        <SelectField
          label="Rating"
          name="rating"
          options={RATING_CHOICES}
          value={form.rating}
          onValueChange={(rating) => setForm({ ...form, rating })}
        />
        {/* Not in the design, but the backend needs them to create a competitor. */}
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Gender"
            name="gender"
            required
            options={GENDER_OPTIONS}
            value={form.gender}
            onValueChange={(gender) => setForm({ ...form, gender })}
          />
          <TextField label="Birth date" type="date" required {...field("birthdate")} />
        </div>
        <TextField label="Division" placeholder="ex. Div I" required {...field("division")} />
        <Button type="submit" className="w-full" disabled={!complete || pending}>
          Add Fencer
        </Button>
      </form>
    </Sheet>
  );
}

export { AddFencerSheet };
