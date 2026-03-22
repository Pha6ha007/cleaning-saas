#!/bin/bash
# =============================================================================
# PostgreSQL Restore Script for Proof Platform
# =============================================================================
#
# Usage:
#   ./restore-postgres.sh /var/backups/proofplatform/proofplatform_20260322.sql.gz
#
# WARNING: This will DROP and RECREATE the target database!
# =============================================================================

set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <backup_file.sql.gz>" >&2
    echo ""
    echo "Available backups:"
    ls -lh "${BACKUP_DIR:-/var/backups/proofplatform}"/proofplatform_*.sql.gz 2>/dev/null || echo "  (none found)"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: ${BACKUP_FILE}" >&2
    exit 1
fi

# --- Parse DATABASE_URL ---
if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL not set." >&2
    exit 1
fi

DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

echo "=== RESTORE WARNING ==="
echo "  Database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}"
echo "  Backup:   ${BACKUP_FILE}"
echo ""
echo "  This will DROP all existing data and restore from backup."
echo ""
read -p "  Type 'yes' to continue: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore canceled."
    exit 0
fi

echo ""
echo "[$(date -Iseconds)] Starting restore..."

# Decompress and restore
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASS" pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --verbose \
    2>/dev/null

echo "[$(date -Iseconds)] Restore complete ✓"
echo ""
echo "Post-restore checklist:"
echo "  1. Run migrations:  python manage.py migrate"
echo "  2. Verify:          python manage.py check"
echo "  3. Restart:         sudo systemctl restart gunicorn"
