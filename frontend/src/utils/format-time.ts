export function formatTime(recordedAt: string | null) {
  if (recordedAt === null) {
    return "Saving…";
  }
  return new Date(recordedAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
