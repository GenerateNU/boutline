"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Textarea } from "@/components/primitives/textarea";

import { EventFields } from "./event-fields";

const authorities = ["askFRED", "USA Fencing", "FIE", "Other"];

function NewTournamentForm() {
  const router = useRouter();
  const [eventCount, setEventCount] = useState(0);

  // No backend yet: submitting discards the form and returns to the dashboard.
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/admin");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
