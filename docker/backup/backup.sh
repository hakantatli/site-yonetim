#!/bin/bash
set -eo pipefail

if [ -f /etc/backup.env ]; then
  # shellcheck disable=SC1091
  source /etc/backup.env
fi

TIMESTAMP=$(date +"%Y%m%d%H%M")
DB_NAME="${POSTGRES_DB:-binaportal}"
DB_USER="${POSTGRES_USER:-binaportal_user}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
FILENAME="${TIMESTAMP}.${DB_NAME}.sql.gz"
BACKUP_FILE="/backup/${FILENAME}"

export PGPASSWORD="${POSTGRES_PASSWORD}"

mkdir -p /backup

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup for database '${DB_NAME}' on host '${DB_HOST}'..."

pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  | gzip -9 > "${BACKUP_FILE}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local backup completed: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Upload to OCI Object Storage via Pre-Authenticated Request (PAR) if configured
if [ -n "${OCI_BACKUP_PAR_URL}" ]; then
  PAR_BASE="${OCI_BACKUP_PAR_URL%/}/"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading '${FILENAME}' to OCI Object Storage..."
  if curl -fsS -X PUT --upload-file "${BACKUP_FILE}" "${PAR_BASE}${FILENAME}" > /dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Successfully uploaded '${FILENAME}' to OCI Object Storage."
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: Failed to upload '${FILENAME}' to OCI Object Storage." >&2
  fi
fi

# Rotate old local backups keeping only the newest MAX_BACKUPS files
if [ -n "${MAX_BACKUPS}" ] && [ "${MAX_BACKUPS}" -gt 0 ] 2>/dev/null; then
  ls -1t /backup/*.sql.gz 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | while read -r old_file; do
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Removing old local backup: ${old_file}"
    rm -f "${old_file}"
  done
fi
