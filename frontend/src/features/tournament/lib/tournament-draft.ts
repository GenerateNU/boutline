const key = "tournament-draft";

export function saveTournamentDraft(form: HTMLFormElement) {
  try {
    sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(new FormData(form))));
  } catch {}
}

export function restoreTournamentDraft(form: HTMLFormElement) {
  try {
    const draft: Record<string, string> = JSON.parse(sessionStorage.getItem(key) ?? "{}");
    for (const [name, value] of Object.entries(draft)) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
        field.value = value;
      }
    }
  } catch {}
}

export function clearTournamentDraft() {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
