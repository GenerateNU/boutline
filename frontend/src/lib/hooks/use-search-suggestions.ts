import { useRef, useState } from "react";

import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

const debounceMs = 300;

// Search-as-you-type: holds the box's text and the suggestions for it, which
// stay null while the box is empty so nothing shows until the user types.
function useSearchSuggestions<T>(fetchSuggestions: (term: string) => Promise<T[]>) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<T[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const latestRequestId = useRef(0);

  async function search(term: string) {
    // Typing fires overlapping requests whose responses can arrive out of
    // order, so each gets an id and only the newest one may update the list.
    const requestId = ++latestRequestId.current;
    if (!term) {
      setSuggestions(null);
      setFailed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const found = await fetchSuggestions(term);
      if (requestId === latestRequestId.current) {
        setSuggestions(found);
        setFailed(false);
        setLoading(false);
      }
    } catch {
      if (requestId === latestRequestId.current) {
        setFailed(true);
        setLoading(false);
      }
    }
  }

  const [debouncedSearch, cancelSearch] = useDebouncedCallback(search, debounceMs);

  function change(value: string) {
    setQuery(value);
    debouncedSearch(value.trim());
  }

  function clear() {
    setQuery("");
    cancelSearch();
    void search("");
  }

  return { query, suggestions, failed, loading, change, clear };
}

export { useSearchSuggestions };
