// Command atlasloader prints the DDL for every gorm model in this service.
// Atlas runs it as the desired state for `atlas migrate diff`, so the models
// stay the single source of truth for the schema.
//
// Add each new feature's model to the Load call as a pointer argument
// (`Load(&example.Example{})`) — a model Atlas cannot see is a table that never
// gets migrated.
package main

import (
	_ "embed"
	"fmt"
	"io"
	"os"

	"boutline/internal/features/bout"
	"boutline/internal/features/competitor"
	"boutline/internal/features/directelimination"
	"boutline/internal/features/event"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"
	"boutline/internal/features/scoring"
	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/features/user"

	"ariga.io/atlas-provider-gorm/gormschema"
)

// fuzzySearchSchema covers the extension and expression indexes gorm has no
// way to declare (see migrations/20261012020658_enable_fuzzy_search.sql).
// Appending it here keeps atlas's desired state in sync with that hand-written
// migration, so `atlas migrate diff` doesn't try to undo it.
//
//go:embed fuzzy_search.sql
var fuzzySearchSchema string

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "atlasloader: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	stmts, err := gormschema.New("postgres").Load(
		&bout.Bout{},
		&event.Event{},
		&tournament.Tournament{},
		&tournamentuser.TournamentUser{},
		&user.User{},
		&competitor.Competitor{},
		&poolstage.PoolStage{},
		&pool.Pool{},
		&directelimination.DirectElimination{},
		&scoring.Scoring{},
	)
	if err != nil {
		return fmt.Errorf("load gorm schema: %w", err)
	}

	if _, err := io.WriteString(os.Stdout, stmts+fuzzySearchSchema); err != nil {
		return fmt.Errorf("write schema: %w", err)
	}

	return nil
}
