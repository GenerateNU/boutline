import { useState } from "react";

import { useSearchSuggestions } from "@/lib/hooks/use-search-suggestions";

// Search-as-you-type plus a committed filter value, for fields where typed
// text (not just a picked suggestion) can be the filter.
function useFilterSearch<T>(fetchSuggestions: (term: string) => Promise<T[]>) {
  const [value, setValue] = useState("");
  const { query, suggestions, failed, loading, change, clear } = useSearchSuggestions(fetchSuggestions);

  function pick(next: string) {
    setValue(next);
    clear();
  }

  function commitText(text: string) {
    setValue(text);
    clear();
  }

  function reset(next = "") {
    setValue(next);
    clear();
  }

  // Read synchronously at submit time: the sheet's onSubmit calls this in the
  // same event as a pending Enter commit, so it can't wait for `value` to
  // update through state. Pending box text wins over the already-committed
  // value since it reflects the user's most recent intent.
  function submitValue() {
    return query.trim() || value || undefined;
  }

  return { value, query, suggestions, failed, loading, change, pick, commitText, reset, submitValue };
}

export { useFilterSearch };
