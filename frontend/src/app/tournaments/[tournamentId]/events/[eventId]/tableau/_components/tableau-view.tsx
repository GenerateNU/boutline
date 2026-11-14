"use client";

import { useState } from "react";
import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import ListOutlined from "@mui/icons-material/ListOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";

import { Button } from "@/components/primitives/button";
import { ButtonGroup } from "@/components/primitives/button-group";
import { Input } from "@/components/primitives/input";
import type { Tableau } from "../../_types/tableau";
import { latestMatchingRoundId } from "./latest-matching-round";
import { TableauBracket } from "./tableau-bracket";
import { TableauList } from "./tableau-list";

type View = "bracket" | "list";

interface TableauViewProps {
  tableau: Tableau;
  boutBasePath: string;
}

function TableauView({ tableau, boutBasePath }: TableauViewProps) {
  const [view, setView] = useState<View>("bracket");
  const [selectedRoundId, setSelectedRoundId] = useState(
    tableau.rounds[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");

  // Jumps to the furthest-along round the searched fencer appears in.
  function handleQueryChange(next: string) {
    setQuery(next);
    const roundId = latestMatchingRoundId(tableau.rounds, next);
    if (roundId) {
      setSelectedRoundId(roundId);
    }
  }

  if (tableau.rounds.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        The tableau hasn&apos;t been drawn yet.
      </p>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 pb-4">
        <div className="flex items-center gap-3">
          <label className="flex h-11.5 min-w-0 flex-1 items-center gap-2 rounded-[12px] border border-outline bg-background px-4 shadow-sm">
            <Input
              type="text"
              aria-label="Search fencers or clubs"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder="Enter search text"
              className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 placeholder:text-neutral-secondary focus-visible:ring-0"
            />
            {query === "" ? (
              <SearchOutlined
                aria-hidden
                className="size-5 text-neutral-secondary"
              />
            ) : (
              <Button
                variant="text"
                size="icon"
                className="size-6 text-neutral-secondary [&_svg]:size-5"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <CancelOutlined aria-hidden />
              </Button>
            )}
          </label>
          <Button
            variant="outline"
            size="icon"
            className="size-11.5 rounded-[12px] border-outline text-neutral-secondary hover:bg-muted"
            aria-label={view === "bracket" ? "Show as list" : "Show as bracket"}
            onClick={() => setView(view === "bracket" ? "list" : "bracket")}
          >
            {view === "bracket" ? <ListOutlined /> : <AccountTreeOutlined />}
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-4 z-10 -mx-4 h-24 bg-linear-to-b from-fencing-white from-50% to-transparent"
        />
        <div className="absolute inset-x-0 top-0 z-20">
          <ButtonGroup
            aria-label="Rounds"
            options={tableau.rounds.map((round) => ({
              value: round.id,
              label: round.name,
            }))}
            value={selectedRoundId}
            onValueChange={setSelectedRoundId}
          />
        </div>

        {view === "bracket" ? (
          <TableauBracket
            rounds={tableau.rounds}
            focusedRoundId={selectedRoundId}
            onFocusedRoundChange={setSelectedRoundId}
            query={query}
            boutBasePath={boutBasePath}
          />
        ) : (
          <div className="h-full overflow-y-auto pt-16 pb-6">
            <TableauList
              rounds={tableau.rounds}
              selectedRoundId={selectedRoundId}
              query={query}
              boutBasePath={boutBasePath}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export { TableauView };
