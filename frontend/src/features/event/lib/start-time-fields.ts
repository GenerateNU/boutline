export function splitStartTime(startTime: string | null): { date: Date | undefined; time: string } {
  if (!startTime) {
    return { date: undefined, time: "" };
  }
  const instant = new Date(startTime);
  const hours = String(instant.getUTCHours()).padStart(2, "0");
  const minutes = String(instant.getUTCMinutes()).padStart(2, "0");
  return {
    date: new Date(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()),
    time: `${hours}:${minutes}`,
  };
}

export function joinStartTime(date: Date, time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes),
  ).toISOString();
}
