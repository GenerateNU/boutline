package repository

import "gorm.io/gorm"

// Repository is the single handle the service layer is given: one field per
// domain repository, constructed once at startup and carried down through
// types.ServiceParams.
type Repository struct {
	User UserRepository

	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{
		User: NewUserRepository(db),
		db:   db,
	}
}

// GetDB exposes the pool for the transactions a single repository cannot own.
func (r *Repository) GetDB() *gorm.DB {
	return r.db
}
