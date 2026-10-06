#!/bin/bash
set -eo pipefail

if [ -f /etc/backup.env ]; then
  # shellcheck disable=SC1091
  source /etc/backup.env
fi

RESTORE_FILE="$1"
DB_NAME="${POSTGRES_DB:-binaportal}"
DB_USER="${POSTGRES_USER:-binaportal_user}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"

if [ -z "${RESTORE_FILE}" ]; then
  echo "Usage: /restore.sh /backup/<filename>.sql.gz"
  echo "Available backups in /backup/:"
  ls -lh /backup/*.sql.gz 2>/dev/null || echo "No backup files found."
  exit 1
fi

if [ ! -f "${RESTORE_FILE}" ]; then
  echo "Error: Backup file '${RESTORE_FILE}' not found."
  exit 1
fi

export PGPASSWORD="${POSTGRES_PASSWORD}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring database '${DB_NAME}' from '${RESTORE_FILE}'..."
gunzip -c "${RESTORE_FILE}" | psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restore completed successfully."
