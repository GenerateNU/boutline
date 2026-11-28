// The `checkedIn` list filter: "true" is present, "false" is absent.
export const CHECK_IN_OPTIONS: { value: string; label: string }[] = [
  { value: "true", label: "Present" },
  { value: "false", label: "Absent" },
];

// Anything else is dropped, since the backend rejects it.
export function parseCheckInFilter(value: string): string | undefined {
  return CHECK_IN_OPTIONS.some((option) => option.value === value) ? value : undefined;
}
