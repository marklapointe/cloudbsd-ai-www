#!/bin/sh
set -e

# Path to the configuration file
CONFIG_FILE="/app/etc/config.json"

# Ensure the directory exists
mkdir -p /app/etc

# Generate config.json from environment variables if it doesn't exist
# or if you want to override it every time.
# Here we'll generate it if it doesn't exist to allow volume mounting an existing one.
if [ ! -f "$CONFIG_FILE" ] || [ "$OVERWRITE_CONFIG" = "true" ]; then
    echo "Generating $CONFIG_FILE from environment variables..."
    
    # Default values if not provided via ENV
    PORT=${PORT:-3001}
    SERVERNAME=${SERVERNAME:-localhost}
    SECRET_KEY=${SECRET_KEY:-your-secret-key-change-me}
    DEMO_MODE=${DEMO_MODE:-true}
    SSL_ENABLED=${SSL_ENABLED:-false}
    SSL_CERT_PATH=${SSL_CERT_PATH:-/usr/local/etc/cloudbsd/admin-panel/ssl/cert.pem}
    SSL_KEY_PATH=${SSL_KEY_PATH:-/usr/local/etc/cloudbsd/admin-panel/ssl/key.pem}
    DB_PATH=${DB_PATH:-/app/data/admin.db}

    cat <<EOF > "$CONFIG_FILE"
{
  "port": $PORT,
  "servername": "$SERVERNAME",
  "secretKey": "$SECRET_KEY",
  "demoMode": $DEMO_MODE,
  "dbPath": "$DB_PATH",
  "ssl": {
    "enabled": $SSL_ENABLED,
    "certPath": "$SSL_CERT_PATH",
    "keyPath": "$SSL_KEY_PATH"
  }
}
EOF
fi

# Execute the main application
exec "$@"
