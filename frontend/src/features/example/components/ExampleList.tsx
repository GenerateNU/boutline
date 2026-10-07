"use client";

import { useSelection } from "@/features/example/hooks/useSelection";
import type { Example } from "@/features/example/types/example";
import { formatCreatedAt } from "@/features/example/utils/formatCreatedAt";

export type ExampleListProps = {
  examples: Example[];
};

export function ExampleList({ examples }: ExampleListProps) {
  const { selectedId, toggle } = useSelection();

  return (
    <ul className="flex flex-col gap-2">
      {examples.map((example) => (
        <li key={example.id}>
          <button
            type="button"
            aria-pressed={selectedId === example.id}
            onClick={() => toggle(example.id)}
            className="w-full text-left aria-pressed:font-bold"
          >
            {example.name} · {formatCreatedAt(example.createdAt)}
          </button>
        </li>
      ))}
    </ul>
  );
}
