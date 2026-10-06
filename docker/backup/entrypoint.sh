#!/bin/bash
set -e

# Export env for cron
env | grep -E '^(POSTGRES_|MAX_BACKUPS|OCI_BACKUP_PAR_URL|TZ)' > /etc/backup.env || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Initializing PostgreSQL Backup Container..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cron Schedule: ${CRON_TIME:-0 1 * * *}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database Host: ${POSTGRES_HOST:-postgres}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database Name: ${POSTGRES_DB:-binaportal}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Max Backups Retained: ${MAX_BACKUPS:-15}"

if [ "${INIT_BACKUP}" = "1" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running initial backup on container start..."
  /backup.sh || true
fi

# Configure crond schedule
echo "${CRON_TIME:-0 1 * * *} /backup.sh >> /var/log/cron.log 2>&1" > /etc/crontabs/root

touch /var/log/cron.log
exec crond -f -l 2
