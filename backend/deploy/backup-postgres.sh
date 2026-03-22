#!/bin/bash
# =============================================================================
# PostgreSQL Backup Script for Proof Platform
# =============================================================================
#
# Usage:
#   ./backup-postgres.sh                  # manual backup
#   0 3 * * * /opt/proofplatform/backup-postgres.sh  # cron: daily at 3 AM
#
# Requires: pg_dump, gzip
# Optional: s3cmd or aws cli for offsite backup
#
# Environment variables (from .env or export):
#   DATABASE_URL    — postgres://user:pass@host:port/dbname
#   BACKUP_DIR      — local backup directory (default: /var/backups/proofplatform)
#   BACKUP_RETAIN_DAYS — days to keep local backups (default: 30)
#   BACKUP_S3_BUCKET   — S3/Spaces bucket for offsite backup (optional)
#   BACKUP_S3_PREFIX   — S3 key prefix (default: backups/postgres/)
# =============================================================================

set -euo pipefail

# --- Configuration ---
BACKUP_DIR="${BACKUP_DIR:-/var/backups/proofplatform}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="proofplatform_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# --- Parse DATABASE_URL ---
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL not set. Export it or add to .env" >&2
    exit 1
fi

# Extract components from DATABASE_URL
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

# --- Create backup directory ---
mkdir -p "$BACKUP_DIR"

# --- Run backup ---
echo "[$(date -Iseconds)] Starting PostgreSQL backup: ${BACKUP_FILE}"

PGPASSWORD="$DB_PASS" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --verbose \
    2>/dev/null | gzip > "$BACKUP_PATH"

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${BACKUP_PATH} (${BACKUP_SIZE})"

# --- Verify backup integrity ---
if ! gzip -t "$BACKUP_PATH" 2>/dev/null; then
    echo "ERROR: Backup file is corrupt: ${BACKUP_PATH}" >&2
    rm -f "$BACKUP_PATH"
    exit 1
fi
echo "[$(date -Iseconds)] Backup integrity verified ✓"

# --- Upload to S3 (if configured) ---
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_PREFIX="${BACKUP_S3_PREFIX:-backups/postgres/}"

if [ -n "$S3_BUCKET" ]; then
    S3_PATH="s3://${S3_BUCKET}/${S3_PREFIX}${BACKUP_FILE}"
    echo "[$(date -Iseconds)] Uploading to ${S3_PATH}..."

    if command -v aws &>/dev/null; then
        aws s3 cp "$BACKUP_PATH" "$S3_PATH" --quiet
    elif command -v s3cmd &>/dev/null; then
        s3cmd put "$BACKUP_PATH" "$S3_PATH" --quiet
    else
        echo "WARNING: No S3 CLI found (aws/s3cmd). Skipping offsite backup." >&2
    fi

    echo "[$(date -Iseconds)] Offsite backup uploaded ✓"
fi

# --- Cleanup old backups ---
echo "[$(date -Iseconds)] Cleaning up backups older than ${RETAIN_DAYS} days..."
find "$BACKUP_DIR" -name "proofplatform_*.sql.gz" -mtime +"$RETAIN_DAYS" -delete
REMAINING=$(find "$BACKUP_DIR" -name "proofplatform_*.sql.gz" | wc -l)
echo "[$(date -Iseconds)] Cleanup done. ${REMAINING} backups retained."

# --- Summary ---
echo ""
echo "=== Backup Summary ==="
echo "  File:     ${BACKUP_PATH}"
echo "  Size:     ${BACKUP_SIZE}"
echo "  Retained: ${REMAINING} backups"
echo "  Offsite:  ${S3_BUCKET:-not configured}"
echo "======================"
