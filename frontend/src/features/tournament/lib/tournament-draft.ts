const key = "tournament-draft";

export function saveTournamentDraft(form: HTMLFormElement) {
  try {
    sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(new FormData(form))));
  } catch {}
}

export function readTournamentDraft(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "{}");
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
    sessionStorage.removeItem(key);
  } catch {}
}
