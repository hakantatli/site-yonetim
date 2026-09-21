#!/bin/sh
set -e

# Run migrations on startup if enabled
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$RUN_MIGRATIONS" = "1" ]; then
    echo "📦 [Goose] Running pending database migrations..."
    if [ -n "$DATABASE_URL" ]; then
        goose -dir /app/migrations postgres "$DATABASE_URL" up
        echo "✅ [Goose] Migrations applied successfully."
    else
        echo "⚠️ [Goose] DATABASE_URL is not set, skipping migrations."
    fi
fi

echo "🚀 Starting Site Yönetim backend server..."
exec /app/server
