import { useState } from "react";

export function useSelection() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelectedId((current) => (current === id ? null : id));

  return { selectedId, toggle };
}
