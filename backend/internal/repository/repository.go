package repository

import "gorm.io/gorm"

// Repository is the single handle the service layer is given: one field per
// domain repository, constructed once at startup and carried down through
// types.ServiceParams.
type Repository struct {
	User UserRepository
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{
		User: NewUserRepository(db),
	}
}
