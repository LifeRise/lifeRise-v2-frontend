package database

import (
	"context"
	"fmt"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/liferise/backend/internal/infrastructure/config"
)

// New creates a new GORM database connection with PostgreSQL driver.
//
// Connection priority:
//  1. cfg.URL (LIFERISE_DATABASE_URL) — used verbatim as the DSN.
//     Use this for Supabase connection strings, e.g.:
//     postgres://postgres.[ref]:[pass]@db.[ref].supabase.co:5432/postgres?sslmode=require
//     For Supabase PgBouncer (transaction pooling) append: &prefer_simple_protocol=true
//  2. Individual fields (Host/Port/Username/Password/Database/SSLMode) — used when URL is empty.
func New(cfg *config.DatabaseConfig, debug bool) (*gorm.DB, error) {
	logLevel := logger.Silent
	if debug {
		logLevel = logger.Info
	}

	var dsn string
	if cfg.URL != "" {
		// Full DSN provided — use directly (Supabase connection string, etc.)
		dsn = cfg.URL
	} else {
		// Build DSN from individual fields
		dsn = fmt.Sprintf(
			"host=%s user=%s password=%s dbname=%s port=%d sslmode=%s",
			cfg.Host,
			cfg.Username,
			cfg.Password,
			cfg.Database,
			cfg.Port,
			cfg.SSLMode,
		)
		// Append application name for observability if provided
		if cfg.AppName != "" {
			dsn += fmt.Sprintf(" application_name=%s", cfg.AppName)
		}
		// Append search path if provided (useful for Supabase schemas)
		if cfg.SearchPath != "" {
			dsn += fmt.Sprintf(" search_path=%s", cfg.SearchPath)
		}
	}

	var dialector gorm.Dialector
	if cfg.Driver == "sqlite" {
		dialector = sqlite.Open(dsn)
	} else {
		dialector = postgres.Open(dsn)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger:                 logger.Default.LogMode(logLevel),
		SkipDefaultTransaction: false,
	})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get underlying sql.DB: %w", err)
	}

	// Connection pool tuning for Supabase / PostgreSQL
	// When using Supabase with PgBouncer (transaction pooling), keep MaxOpenConns
	// conservative and ensure ConnMaxLifetime is well under any idle timeout.
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	if cfg.ConnMaxIdleTime > 0 {
		sqlDB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)
	}

	// Health check with a hard deadline so startup never hangs silently.
	// Without a timeout, a slow/unreachable Supabase host can block the
	// process indefinitely — the HTTP server never binds and Railway times out.
	pingCtx, pingCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer pingCancel()
	if err := sqlDB.PingContext(pingCtx); err != nil {
		return nil, fmt.Errorf("ping database (timeout 15s): %w", err)
	}

	return db, nil
}

// NewFromConfig is a convenience constructor using the full Config struct.
func NewFromConfig(cfg *config.Config) (*gorm.DB, error) {
	return New(&cfg.Database, cfg.App.Debug)
}

// Paginate returns a GORM scope for pagination.
func Paginate(page, perPage int) func(db *gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		if page < 1 {
			page = 1
		}
		if perPage < 1 {
			perPage = 15
		}
		if perPage > 100 {
			perPage = 100
		}
		offset := (page - 1) * perPage
		return db.Offset(offset).Limit(perPage)
	}
}

// RetryTx executes a function within a database transaction with simple retry logic.
func RetryTx(db *gorm.DB, maxRetries int, fn func(tx *gorm.DB) error) error {
	var err error
	for i := 0; i < maxRetries; i++ {
		err = db.Transaction(fn)
		if err == nil {
			return nil
		}
		// Simple backoff
		time.Sleep(time.Duration(i+1) * 50 * time.Millisecond)
	}
	return err
}
