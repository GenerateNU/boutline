import { useEffect, useRef, useState } from "react";

// Appends pages after `initial` as an element holding `endRef` scrolls within 200px
// of the viewport. A new `initial` array (a search, a refresh) drops loaded pages.
function useInfiniteList<T>(
  initial: T[],
  total: number,
  loadPage: (offset: number) => Promise<T[]>,
) {
  const [more, setMore] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shownInitial, setShownInitial] = useState(initial);
  const endRef = useRef<HTMLLIElement>(null);
  const loadPageRef = useRef(loadPage);
  useEffect(() => {
    loadPageRef.current = loadPage;
  });

  if (shownInitial !== initial) {
    setShownInitial(initial);
    setMore([]);
    setError(null);
  }

  const items = [...initial, ...more];
  const hasMore = items.length < total && !error;

  // Re-observing after each page fires again while the end is still on screen, so a
  // tall screen keeps loading until the list reaches past it.
  useEffect(() => {
    const end = endRef.current;
    if (!end || loading || !hasMore) {
      return;
    }
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        observer.disconnect();
        setLoading(true);
        try {
          const page = await loadPageRef.current(items.length);
          setMore((m) => [...m, ...page]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't load more");
        } finally {
          setLoading(false);
        }
      },
      { rootMargin: "0px 0px 200px 0px" },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [loading, hasMore, items.length]);

  return { items, loading, hasMore, error, endRef };
}

export { useInfiniteList };
