"use client";

import * as React from "react";
import { List, Network, Search } from "lucide-react";

import { Button } from "@/components/primitives/button";
import { ButtonGroup } from "@/components/primitives/button-group";
import { Input } from "@/components/primitives/input";
import type { Tableau } from "../../_types/tableau";
import { TableauBracket } from "./tableau-bracket";
import { TableauList } from "./tableau-list";

type View = "bracket" | "list";

interface TableauViewProps {
  tableau: Tableau;
  boutBasePath: string;
}

function TableauView({ tableau, boutBasePath }: TableauViewProps) {
  const [view, setView] = React.useState<View>("bracket");
  const [selectedRoundId, setSelectedRoundId] = React.useState(tableau.rounds[0]?.id ?? "");
  const [query, setQuery] = React.useState("");

  if (tableau.rounds.length === 0) {
    return <p className="py-8 text-center text-muted-foreground">The tableau hasn&apos;t been drawn yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-md border border-foreground px-4">
          <p className="sr-only">Search fencers or clubs</p>
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Enter search text"
            className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 focus-visible:ring-0"
          />
          <Search aria-hidden className="size-5" />
        </label>
        <Button
          variant="outline"
          size="icon"
          className="size-12 rounded-md"
          aria-label={view === "bracket" ? "Show as list" : "Show as bracket"}
          onClick={() => setView(view === "bracket" ? "list" : "bracket")}
        >
          {view === "bracket" ? <List /> : <Network />}
        </Button>
      </div>

      <ButtonGroup
        aria-label="Rounds"
        options={tableau.rounds.map((round) => ({ value: round.id, label: round.name }))}
        value={selectedRoundId}
        onValueChange={setSelectedRoundId}
      />

      {view === "bracket" ? (
        <TableauBracket
          rounds={tableau.rounds}
          focusedRoundId={selectedRoundId}
          query={query}
          boutBasePath={boutBasePath}
        />
      ) : (
        <TableauList
          rounds={tableau.rounds}
          selectedRoundId={selectedRoundId}
          query={query}
          boutBasePath={boutBasePath}
        />
      )}
    </div>
  );
}

export { TableauView };