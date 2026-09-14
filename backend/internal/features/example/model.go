// Package example is the template every feature package copies. A feature is a
// folder under internal/features holding five files and its tests:
//
//	model.go       the gorm model and its domain types — no HTTP, no JSON
//	repository.go  queries only, gorm errors translated to errs sentinels
//	types.go       the Huma request and response types — the API contract
//	service.go     takes those types, applies the rules, returns the responses
//	routes.go      builds repository -> service and registers the operations
//	test/          this feature's unit tests and the fakes they run against
//
// Dependencies point one way: routes -> service -> repository. The repository
// is the only layer that does not know it is serving HTTP.
//
// Every exported name starts with the feature's name. Huma keys its schema
// registry by the bare Go type name, so two features that both declared a
// Response would panic at registration.
package example

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ExampleStatus string

const (
	ExampleStatusActive   ExampleStatus = "active"
	ExampleStatusArchived ExampleStatus = "archived"
)

// Example is the persistence shape and carries no json tags on purpose: the
// wire format belongs to types.go, so a column rename is not an API break.
type Example struct {
	ID        uuid.UUID     `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name      string        `gorm:"type:text;not null;uniqueIndex:idx_examples_name,where:deleted_at IS NULL"`
	Status    ExampleStatus `gorm:"type:text;not null;index"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (s ExampleStatus) IsValid() bool {
	return s == ExampleStatusActive || s == ExampleStatusArchived
}

func (Example) TableName() string {
	return "examples"
}
