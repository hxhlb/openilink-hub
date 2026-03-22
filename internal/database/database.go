package database

import (
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
)

type DB struct {
	*sql.DB
}

// Open connects to PostgreSQL. dsn example:
// "postgres://user:pass@localhost:5432/openilink?sslmode=disable"
func Open(dsn string) (*DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(5)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	// Use advisory lock to prevent concurrent migration conflicts
	if _, err := db.Exec("SELECT pg_advisory_lock(1)"); err != nil {
		db.Close()
		return nil, fmt.Errorf("advisory lock: %w", err)
	}
	_, migErr := db.Exec(schema)
	db.Exec("SELECT pg_advisory_unlock(1)")
	if migErr != nil {
		db.Close()
		return nil, fmt.Errorf("run migrations: %w", migErr)
	}

	return &DB{db}, nil
}
