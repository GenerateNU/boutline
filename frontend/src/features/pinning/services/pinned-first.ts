// Pinned items lead, alphabetically by label with numbers compared as numbers ("Pool 2" before "Pool 10");
// the rest keep the order they came in, which is the list's chosen sort.
function pinnedFirst<T>(items: T[], isPinned: (item: T) => boolean, label: (item: T) => string): T[] {
  const pinned = items
    .filter(isPinned)
    .sort((a, b) => label(a).localeCompare(label(b), undefined, { sensitivity: "base", numeric: true }));
  return [...pinned, ...items.filter((item) => !isPinned(item))];
}

export { pinnedFirst };
