const KEY = "tournament-draft";

export function saveTournamentDraft(form: HTMLFormElement) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(Object.fromEntries(new FormData(form))));
  } catch {}
}

export function readTournamentDraft(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function restoreTournamentDraft(form: HTMLFormElement) {
  for (const [name, value] of Object.entries(readTournamentDraft())) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement) {
      field.value = value;
    }
  }
}

export function clearTournamentDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
