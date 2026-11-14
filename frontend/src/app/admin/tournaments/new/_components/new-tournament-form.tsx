"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

import { Button } from "@/components/primitives/button";
import { SelectField } from "@/components/primitives/select-field";
import { TextField } from "@/components/primitives/text-field";
import { ImportDropzone } from "@/features/tournament/components/import-dropzone";
import { readTournamentDraft, restoreTournamentDraft, saveTournamentDraft } from "@/features/tournament/lib/tournament-draft";

const AUTHORITIES = ["askFRED", "USA Fencing", "FIE", "Other"];

const subscribe = () => () => {};

function NewTournamentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const authority = useSyncExternalStore(
    subscribe,
    () => readTournamentDraft().authority ?? "",
    () => "",
  );

  useEffect(() => {
    if (formRef.current) {
      restoreTournamentDraft(formRef.current);
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveTournamentDraft(event.currentTarget);
    router.push("/admin/tournaments/new/event");
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ImportDropzone />

      <TextField label="Name of event" className="mt-3" name="name" required />
      <TextField label="Location" name="location" placeholder="City, State" required />
      <TextField label="Venue" name="venue" required />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Date" name="date" type="date" required />
        <TextField label="Time" name="time" type="time" required />
      </div>
      <SelectField
        key={authority}
        label="Authority"
        name="authority"
        options={AUTHORITIES}
        defaultValue={authority || undefined}
        required
      />

      <Button type="submit" variant="filled" className="mt-6 h-12 rounded-full">
        Continue
      </Button>
    </form>
  );
}

export { NewTournamentForm };
