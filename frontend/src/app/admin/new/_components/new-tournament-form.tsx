"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/primitives/button";
import { Dropzone } from "@/components/primitives/dropzone";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";
import { parseTournamentFile } from "@/lib/parse-tournament-file";

import { EventFields } from "./event-fields";

const authorities = ["askFRED", "USA Fencing", "FIE", "Other"];

const csv = { "text/csv": [".csv"] };
const xml = { "application/xml": [".xml"], "text/xml": [".xml"] };

const importSources = [
  { label: "askFRED", accept: { ...csv, ...xml }, authority: "askFRED" },
  { label: "USA Fencing", accept: { ...csv, ...xml }, authority: "USA Fencing" },
  { label: "XML", accept: xml },
  { label: "CSV", accept: csv },
];

function NewTournamentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [eventCount, setEventCount] = useState(0);
  const [importStatus, setImportStatus] = useState("");

  // No backend yet: submitting discards the form and returns to the dashboard.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/admin");
  }

  // The fields are uncontrolled, so autofill writes straight into the matching form elements.
  async function handleImport(file: File, authority?: string) {
    const form = formRef.current;
    if (!form) return;

    try {
      const details = await parseTournamentFile(file);
      const values = authority ? { ...details, authority } : details;
      for (const [name, value] of Object.entries(values)) {
        const field = form.elements.namedItem(name);
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLSelectElement ||
          field instanceof HTMLTextAreaElement
        ) {
          field.value = value;
        }
      }
      const count = Object.keys(values).length;
      setImportStatus(
        count
          ? `Filled ${count} field${count === 1 ? "" : "s"} from ${file.name}.`
          : `No matching fields found in ${file.name}.`,
      );
    } catch (error) {
      setImportStatus(
        error instanceof Error ? error.message : `Could not read ${file.name}.`,
      );
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-sm">
        Autofill from a file
        <div className="grid grid-cols-2 gap-3">
          {importSources.map(({ label, accept, authority }) => (
            <Dropzone
              key={label}
              label={label}
              accept={accept}
              onFile={(file) => handleImport(file, authority)}
              onReject={setImportStatus}
            />
          ))}
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {importStatus}
        </p>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        Name
        <Input name="name" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Location
        <Input name="location" placeholder="City, State" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Venue
        <Input name="venue" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Date
        <Input name="date" type="date" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Fees
        <Input name="fees" type="number" min="0" step="0.01" placeholder="0.00" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Authority
        <Select name="authority" defaultValue={authorities[0]}>
          {authorities.map((authority) => (
            <option key={authority}>{authority}</option>
          ))}
        </Select>
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Description
        <Textarea name="description" />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Admins
        <Input name="admins" placeholder="Add admins by email, separated by commas" />
      </label>

      {Array.from({ length: eventCount }, (_, index) => (
        <EventFields key={index} index={index} />
      ))}
      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        onClick={() => setEventCount((count) => count + 1)}
      >
        New event
      </Button>

      <Button type="submit" className="mt-2 rounded-full">
        Create tournament
      </Button>
    </form>
  );
}

export { NewTournamentForm };
