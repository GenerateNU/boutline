// Command atlasloader prints the DDL for every gorm model in this service.
// Atlas runs it as the desired state for `atlas migrate diff`, so the models
// stay the single source of truth for the schema.
//
// Register each new feature's model here — a model Atlas cannot see is a table
// that never gets migrated.
package main

import (
	"fmt"
	"io"
	"os"

	"ariga.io/atlas-provider-gorm/gormschema"
	// Import your feature models here so Atlas can see them.
	// _ "boutline/internal/features/example"
)

func main() {
	if err := run(); err != nil {
		_, _ = fmt.Fprintf(os.Stderr, "atlasloader: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	stmts, err := gormschema.New("postgres").Load()
	if err != nil {
		return fmt.Errorf("load gorm schema: %w", err)
	}

	if _, err := io.WriteString(os.Stdout, stmts); err != nil {
		return fmt.Errorf("write schema: %w", err)
	}

	return nil
}
