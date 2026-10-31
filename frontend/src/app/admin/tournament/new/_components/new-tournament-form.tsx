"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/primitives/button";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { ImportDropzone } from "@/features/tournament/components/import-dropzone";
import { restoreTournamentDraft, saveTournamentDraft } from "@/features/tournament/lib/tournament-draft";

const authorities = ["askFRED", "USA Fencing", "FIE", "Other"];

function NewTournamentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (formRef.current) {
      restoreTournamentDraft(formRef.current);
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveTournamentDraft(event.currentTarget);
    router.push("/admin/tournament/new/event");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ImportDropzone />

      <TextField variant="filled" label="Name of event" className="mt-3" name="name" required />
      <TextField variant="filled" label="Location" name="location" placeholder="City, State" required />
      <TextField variant="filled" label="Venue" name="venue" required />
      <div className="grid grid-cols-2 gap-3">
        <TextField variant="filled" label="Date" name="date" type="date" required />
        <TextField variant="filled" label="Time" name="time" type="time" required />
      </div>
      <SelectField variant="filled" label="Authority" name="authority" options={authorities} placeholder="" required />

      <Button type="submit" variant="brand" className="mt-6 h-12 rounded-full">
        Continue
      </Button>
    </form>
  );
}

export { NewTournamentForm };
