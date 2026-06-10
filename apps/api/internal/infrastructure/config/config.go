package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/spf13/viper"
)

// Config holds all application configuration.
type Config struct {
	App      AppConfig      `mapstructure:"app"`
	Database DatabaseConfig `mapstructure:"database"`
	Redis    RedisConfig    `mapstructure:"redis"`
	JWT      JWTConfig      `mapstructure:"jwt"`
	Stripe   StripeConfig   `mapstructure:"stripe"`
	Firebase FirebaseConfig `mapstructure:"firebase"`
	Asynq    AsynqConfig    `mapstructure:"asynq"`
	Server   ServerConfig   `mapstructure:"server"`
	S3       S3Config       `mapstructure:"s3"`
	Mail     MailConfig     `mapstructure:"mail"`
	Supabase SupabaseConfig `mapstructure:"supabase"`
	CORS     CORSConfig     `mapstructure:"cors"`
}

// AppConfig holds general application settings.
type AppConfig struct {
	Name     string `mapstructure:"name"`
	Env      string `mapstructure:"env"`
	Debug    bool   `mapstructure:"debug"`
	Timezone string `mapstructure:"timezone"`
	URL      string `mapstructure:"url"`
}

// DatabaseConfig holds PostgreSQL connection settings.
// Set LIFERISE_DATABASE_URL to a full DSN (e.g. a Supabase connection string) to override all
// individual host/port/user/password fields. Individual fields are used only when URL is empty.
// Environment variables use LIFERISE_DATABASE_ prefix (e.g. LIFERISE_DATABASE_HOST).
type DatabaseConfig struct {
	// URL is a full PostgreSQL DSN. When set it takes precedence over all other fields.
	// Example (Supabase direct):  postgres://postgres.ref:pass@db.ref.supabase.co:5432/postgres?sslmode=require
	// Example (Supabase pooler):  postgres://postgres.ref:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&prefer_simple_protocol=true
	URL             string        `mapstructure:"url"`
	Driver          string        `mapstructure:"driver"`
	Host            string        `mapstructure:"host"`
	Port            int           `mapstructure:"port"`
	Database        string        `mapstructure:"database"`
	Username        string        `mapstructure:"username"`
	Password        string        `mapstructure:"password"`
	SSLMode         string        `mapstructure:"ssl_mode"`
	AppName         string        `mapstructure:"app_name"`
	SearchPath      string        `mapstructure:"search_path"`
	MaxOpenConns    int           `mapstructure:"max_open_conns"`
	MaxIdleConns    int           `mapstructure:"max_idle_conns"`
	ConnMaxLifetime time.Duration `mapstructure:"conn_max_lifetime"`
	ConnMaxIdleTime time.Duration `mapstructure:"conn_max_idle_time"`
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
}

// JWTConfig holds JWT signing configuration.
type JWTConfig struct {
	Secret        string        `mapstructure:"secret"`
	AccessExpiry  time.Duration `mapstructure:"access_expiry"`
	RefreshExpiry time.Duration `mapstructure:"refresh_expiry"`
	Issuer        string        `mapstructure:"issuer"`
}

// StripeConfig holds Stripe API credentials.
type StripeConfig struct {
	SecretKey          string  `mapstructure:"secret_key"`
	PublishableKey     string  `mapstructure:"publishable_key"`
	WebhookSecret      string  `mapstructure:"webhook_secret"`
	OAuthClientID      string  `mapstructure:"oauth_client_id"`
	PlatformFeePercent float64 `mapstructure:"platform_fee_percent"`
}

// FirebaseConfig holds Firebase project credentials.
type FirebaseConfig struct {
	CredentialsPath   string `mapstructure:"credentials_path"`
	ProjectID         string `mapstructure:"project_id"`
	DatabaseURL       string `mapstructure:"database_url"`
	StorageBucket     string `mapstructure:"storage_bucket"`
	APIKey            string `mapstructure:"api_key"`
	AuthDomain        string `mapstructure:"auth_domain"`
	MessagingSenderID string `mapstructure:"messaging_sender_id"`
	AppID             string `mapstructure:"app_id"`
	VAPIDKey          string `mapstructure:"vapid_key"`
	MeasurementID     string `mapstructure:"measurement_id"`
}

// MailConfig holds email delivery settings (SMTP or Resend).
type MailConfig struct {
	Driver       string `mapstructure:"driver"`
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	Username     string `mapstructure:"username"`
	Password     string `mapstructure:"password"`
	Encryption   string `mapstructure:"encryption"`
	FromAddress  string `mapstructure:"from_address"`
	FromName     string `mapstructure:"from_name"`
	ResendAPIKey string `mapstructure:"resend_api_key"`
}

// AsynqConfig holds Asynq Redis configuration.
type AsynqConfig struct {
	RedisAddr     string `mapstructure:"redis_addr"`
	RedisPassword string `mapstructure:"redis_password"`
	RedisDB       int    `mapstructure:"redis_db"`
	Concurrency   int    `mapstructure:"concurrency"`
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Host         string        `mapstructure:"host"`
	Port         int           `mapstructure:"port"`
	ReadTimeout  time.Duration `mapstructure:"read_timeout"`
	WriteTimeout time.Duration `mapstructure:"write_timeout"`
	IdleTimeout  time.Duration `mapstructure:"idle_timeout"`
}

// S3Config holds S3-compatible storage settings.
type S3Config struct {
	Bucket       string `mapstructure:"bucket"`
	Region       string `mapstructure:"region"`
	Endpoint     string `mapstructure:"endpoint"`
	AccessKey    string `mapstructure:"access_key"`
	SecretKey    string `mapstructure:"secret_key"`
	UsePathStyle bool   `mapstructure:"use_path_style"`
}

// CORSConfig holds CORS settings for the HTTP server.
type CORSConfig struct {
	Enabled          bool     `mapstructure:"enabled"`
	AllowOrigins     []string `mapstructure:"allow_origins"`
	AllowMethods     []string `mapstructure:"allow_methods"`
	AllowHeaders     []string `mapstructure:"allow_headers"`
	ExposeHeaders    []string `mapstructure:"expose_headers"`
	AllowCredentials bool     `mapstructure:"allow_credentials"`
	MaxAge           int      `mapstructure:"max_age"`
}

// SupabaseConfig holds Supabase project credentials.
// These are used for Supabase REST/Realtime/Storage APIs beyond raw PostgreSQL access.
// The database connection itself is configured via DatabaseConfig (use LIFERISE_DATABASE_URL
// for the Supabase connection string).
// Environment variables: LIFERISE_SUPABASE_PROJECT_REF, LIFERISE_SUPABASE_ANON_KEY, etc.
type SupabaseConfig struct {
	// ProjectRef is the Supabase project reference ID (e.g. "bbiebzxbgiiobjhuougr").
	ProjectRef string `mapstructure:"project_ref"`
	// ProjectURL is the full Supabase project API URL (e.g. "https://bbiebzxbgiiobjhuougr.supabase.co").
	ProjectURL string `mapstructure:"project_url"`
	// AnonKey is the public anon key for client-facing Supabase API calls.
	AnonKey string `mapstructure:"anon_key"`
	// ServiceRoleKey is the privileged service role key. NEVER expose to mobile clients.
	ServiceRoleKey string `mapstructure:"service_role_key"`
}

// Validate checks that the minimum required configuration is present.
// Call this immediately after Load() so startup fails fast with a human-readable
// message instead of a cryptic driver-level connection error.
func (c *Config) Validate() error {
	// Database: need either a full DSN or at minimum host + database name.
	if c.Database.URL == "" {
		if c.Database.Host == "" || c.Database.Host == "127.0.0.1" && c.Database.Database == "" {
			return fmt.Errorf(
				"database is not configured: set LIFERISE_DATABASE_URL to a full PostgreSQL DSN " +
					"(e.g. postgres://user:pass@host:5432/dbname?sslmode=require). " +
					"Alternatively set LIFERISE_DATABASE_HOST, LIFERISE_DATABASE_DATABASE, " +
					"LIFERISE_DATABASE_USERNAME, and LIFERISE_DATABASE_PASSWORD individually",
			)
		}
		if c.Database.Database == "" {
			return fmt.Errorf("database name is not configured: set LIFERISE_DATABASE_DATABASE or LIFERISE_DATABASE_URL")
		}
		if c.Database.Username == "" {
			return fmt.Errorf("database username is not configured: set LIFERISE_DATABASE_USERNAME or LIFERISE_DATABASE_URL")
		}
	}

	// JWT secret must be present and long enough to be secure.
	if c.JWT.Secret == "" {
		return fmt.Errorf("JWT secret is not configured: set LIFERISE_JWT_SECRET (minimum 32 characters)")
	}
	if len(c.JWT.Secret) < 32 {
		return fmt.Errorf("JWT secret is too short (%d chars): LIFERISE_JWT_SECRET must be at least 32 characters", len(c.JWT.Secret))
	}

	return nil
}

// Load reads configuration from environment variables and optional config files.
func Load(paths ...string) (*Config, error) {
	// Load .env file if present (local development). Silently ignored when the
	// file doesn't exist (e.g. Docker / Railway where vars come from the platform).
	// godotenv.Load does NOT override vars that are already set in the shell,
	// so Railway Variables always win over a stale local .env.
	_ = godotenv.Load()

	v := viper.New()
	v.SetConfigType("yaml")
	v.SetConfigName("config")

	// Default search paths
	v.AddConfigPath(".")
	v.AddConfigPath("./configs")
	v.AddConfigPath("/etc/liferise/")

	for _, p := range paths {
		v.AddConfigPath(p)
	}

	// Environment variable binding
	v.SetEnvPrefix("LIFERISE")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Defaults
	setDefaults(v)

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("read config: %w", err)
		}
		// Config file not found; rely on env vars + defaults
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	// Respect cloud platform PORT overrides (e.g. Railway, Heroku, Render)
	if portStr := os.Getenv("PORT"); portStr != "" {
		if port, err := strconv.Atoi(portStr); err == nil {
			cfg.Server.Port = port
		}
	}

	// Viper's AutomaticEnv only maps env vars for keys it already knows about
	// (from defaults or a config file). On platforms without a config.yaml
	// (Railway, Heroku, Docker) these critical keys have no default, so we
	// read them directly from the environment as a reliable fallback.
	if url := os.Getenv("LIFERISE_DATABASE_URL"); url != "" {
		cfg.Database.URL = url
	}
	if secret := os.Getenv("LIFERISE_JWT_SECRET"); secret != "" {
		cfg.JWT.Secret = secret
	}

	// Viper does not natively parse comma-separated env vars into []string.
	// Allow LIFERISE_CORS_ALLOW_ORIGINS=https://a.com,https://b.com for easy platform config.
	if originsStr := os.Getenv("LIFERISE_CORS_ALLOW_ORIGINS"); originsStr != "" {
		origins := strings.Split(originsStr, ",")
		for i := range origins {
			origins[i] = strings.TrimSpace(origins[i])
		}
		cfg.CORS.AllowOrigins = origins
	}

	// Allow LIFERISE_RESEND_API_KEY as a shorthand for LIFERISE_MAIL_RESEND_API_KEY
	if key := os.Getenv("LIFERISE_RESEND_API_KEY"); key != "" {
		cfg.Mail.ResendAPIKey = key
	}

	// Supabase credentials are required for the OAuth bridge (LoginWithSupabaseToken).
	// Like DATABASE_URL and JWT_SECRET, Viper's AutomaticEnv does not pick these up on
	// platforms without a config.yaml (Railway, Heroku, Docker) because no defaults are
	// set for them. Read them directly from the environment as a reliable fallback.
	if projectURL := os.Getenv("LIFERISE_SUPABASE_PROJECT_URL"); projectURL != "" {
		cfg.Supabase.ProjectURL = projectURL
	}
	if anonKey := os.Getenv("LIFERISE_SUPABASE_ANON_KEY"); anonKey != "" {
		cfg.Supabase.AnonKey = anonKey
	}
	if serviceRoleKey := os.Getenv("LIFERISE_SUPABASE_SERVICE_ROLE_KEY"); serviceRoleKey != "" {
		cfg.Supabase.ServiceRoleKey = serviceRoleKey
	}
	if projectRef := os.Getenv("LIFERISE_SUPABASE_PROJECT_REF"); projectRef != "" {
		cfg.Supabase.ProjectRef = projectRef
	}

	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	v.SetDefault("app.name", "liferise-backend")
	v.SetDefault("app.env", "production")
	v.SetDefault("app.debug", false)
	v.SetDefault("app.timezone", "UTC")

	v.SetDefault("database.driver", "postgres")
	v.SetDefault("database.host", "127.0.0.1")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.ssl_mode", "prefer")
	v.SetDefault("database.max_open_conns", 25)
	v.SetDefault("database.max_idle_conns", 10)
	v.SetDefault("database.conn_max_lifetime", "1h")
	v.SetDefault("database.conn_max_idle_time", "30m")

	v.SetDefault("redis.host", "127.0.0.1")
	v.SetDefault("redis.port", 6379)
	v.SetDefault("redis.db", 0)

	v.SetDefault("jwt.access_expiry", "15m")
	v.SetDefault("jwt.refresh_expiry", "168h") // 7 days
	v.SetDefault("jwt.issuer", "liferise-backend")

	v.SetDefault("stripe.platform_fee_percent", 12.0)

	v.SetDefault("mail.driver", "smtp")
	v.SetDefault("mail.encryption", "ssl")

	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.read_timeout", "15s")
	v.SetDefault("server.write_timeout", "15s")
	v.SetDefault("server.idle_timeout", "60s")

	v.SetDefault("asynq.concurrency", 10)

	v.SetDefault("cors.enabled", true)
	v.SetDefault("cors.allow_origins", []string{"http://localhost:3000"})
	v.SetDefault("cors.allow_methods", []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"})
	v.SetDefault("cors.allow_headers", []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"})
	v.SetDefault("cors.expose_headers", []string{"Content-Length", "Content-Type", "Authorization"})
	v.SetDefault("cors.allow_credentials", true)
	v.SetDefault("cors.max_age", 86400)
}
