"use client";

import CloseOutlined from "@mui/icons-material/CloseOutlined";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/primitives/button";
import { ButtonGroup } from "@/components/primitives/button-group";
import { Card } from "@/components/primitives/card";
import { DateField } from "@/components/primitives/date-field";
import { SelectField } from "@/components/primitives/select-field";
import { Text } from "@/components/primitives/text";
import { TimeField } from "@/components/primitives/time-field";
import { useToast } from "@/components/primitives/toast";
import {
  AGE_OPTIONS,
  GENDER_OPTIONS,
  RATING_LIMIT_OPTIONS,
  TYPE_OPTIONS,
  WEAPON_OPTIONS,
} from "@/features/event/lib/event-filters";
import { updateEvent } from "@/features/event/services/updateEvent";
import type {
  EventAgeCategory,
  EventGender,
  EventRatingLimit,
  EventType,
  EventWeapon,
  TournamentEvent,
} from "@/features/event/types/event";
import { errorMessage } from "@/utils/error-message";

import { EMD_FORM_FIELDS } from "../../_components/emd-form-fields";
import { type EventSettingsValues, updateFrom, valuesFrom } from "../_lib/event-settings-values";

const FORMAT_OPTIONS = [{ value: "pool_then_direct_elimination", label: "Pools into Direct Elimination" }];
// Select items can't use "" as a value, so None has its own and maps back to unset.
const NONE = "none";
const NONE_OPTION = { value: NONE, label: "None" };
const TYPE_CHOICES = [NONE_OPTION, ...TYPE_OPTIONS];
const AGE_CHOICES = [NONE_OPTION, ...AGE_OPTIONS];

interface EventSettingsFormProps {
  event: TournamentEvent;
  canManage: boolean;
}

export function EventSettingsForm({ event, canManage }: EventSettingsFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(() => valuesFrom(event));
  // The API only accepts edits before the event starts.
  const editable = event.status === "upcoming";

  function change(patch: Partial<EventSettingsValues>) {
    setValues((current) => ({ ...current, ...patch }));
  }

  function cancel() {
    setValues(valuesFrom(event));
    setEditing(false);
  }

  function save() {
    startTransition(async () => {
      try {
        await updateEvent(event.id, updateFrom(values, event));
        toast({ description: "Event updated" });
        setEditing(false);
        router.refresh();
      } catch (err) {
        toast({ description: errorMessage(err) });
      }
    });
  }

  return (
    <Card className="gap-4 rounded-[20px] p-5 font-manrope">
      <div className="flex items-center justify-between gap-2">
        <Text as="h2" variant="title">
          Event Information
        </Text>
        {editing && (
          <Button variant="text" size="icon" aria-label="Cancel editing" onClick={cancel} disabled={pending}>
            <CloseOutlined aria-hidden />
          </Button>
        )}
      </div>

      <fieldset disabled={!editing || pending} className={`min-w-0 ${EMD_FORM_FIELDS}`}>
        <SelectField
          label="Type of Event"
          options={TYPE_CHOICES}
          value={values.type}
          onValueChange={(type) => change({ type: type === NONE ? "" : (type as EventType) })}
        />
        <div className="grid grid-cols-2 gap-3">
          <DateField
            label="Date"
            presentation="modal"
            value={values.date}
            onValueChange={(date) => change({ date })}
          />
          <TimeField label="Time" value={values.time} onValueChange={(time) => change({ time })} />
        </div>
        <div className="flex flex-col gap-2">
          <Text>Weapon</Text>
          <ButtonGroup
            aria-label="Weapon"
            options={WEAPON_OPTIONS}
            value={values.weapon}
            onValueChange={(weapon) => change({ weapon: weapon as EventWeapon })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Text>Gender Mix</Text>
          <ButtonGroup
            aria-label="Gender Mix"
            options={GENDER_OPTIONS}
            value={values.gender}
            onValueChange={(gender) => change({ gender: gender as EventGender })}
          />
        </div>
        <SelectField
          label="Age Category"
          options={AGE_CHOICES}
          value={values.ageCategory}
          onValueChange={(ageCategory) =>
            change({ ageCategory: ageCategory === NONE ? "" : (ageCategory as EventAgeCategory) })
          }
        />
        {/* The API sets the format at creation and has only one, so it is never editable here. */}
        <SelectField label="Event Format" options={FORMAT_OPTIONS} value={event.format} disabled />
        <SelectField
          label="Rating Level"
          options={RATING_LIMIT_OPTIONS}
          value={values.ratingLimit}
          onValueChange={(ratingLimit) => change({ ratingLimit: ratingLimit as EventRatingLimit })}
        />
      </fieldset>

      {canManage &&
        (editing ? (
          <Button className="w-full" onClick={save} disabled={pending}>
            Save
          </Button>
        ) : (
          <Button className="w-full" onClick={() => setEditing(true)} disabled={!editable}>
            Edit
          </Button>
        ))}
      {canManage && !editable && (
        <Text variant="caption">Events can only be edited before they start.</Text>
      )}
    </Card>
  );
}
