# Deployment Guide: Email, Rate Limiting, Backups, Logging

## 1. Email Service

### Configuration (`.env`)

```bash
# === Email SMTP (pick one provider) ===

# Option A: Resend (recommended for SaaS)
EMAIL_HOST=smtp.resend.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=resend
EMAIL_HOST_PASSWORD=re_xxxxxxxxxxxx
DEFAULT_FROM_EMAIL="Proof Platform <noreply@yourdomain.com>"

# Option B: SendGrid
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=SG.xxxxxxxxxxxx

# Option C: Gmail (existing setup)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=reports.cleanproof@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Frontend URL (for links in emails)
FRONTEND_URL=https://app.proofplatform.com
```

### What gets sent automatically

| Email | Trigger | Template |
|-------|---------|----------|
| Verification | User signs up | `verification.html` |
| Password reset | User requests reset | `password_reset.html` |
| Trial 3-day warning | Celery daily task | `trial_expiry_reminder.html` |
| Trial 1-day warning | Celery daily task | `trial_expiry_reminder.html` |
| Trial expired | Celery daily task | `trial_expiry_reminder.html` |
| Payment success | Paddle webhook (subscription.activated) | `payment_success.html` |
| Payment failed | Paddle webhook (subscription.past_due) | `payment_failed.html` |
| Subscription canceled | Paddle webhook (subscription.canceled) | `subscription_canceled.html` |

### After deploy

```bash
# Register the trial expiry task in Celery Beat
python manage.py setup_periodic_tasks

# Test email delivery
python manage.py shell -c "
from apps.emails.service import send_transactional_email
send_transactional_email(
    'verification',
    'your@email.com',
    {'user_name': 'Test', 'verify_url': 'https://example.com'},
    'Test Email',
    fail_silently=False,
)
"
```

---

## 2. Rate Limiting

### Django (DRF) — already active

Throttle rates in `settings.py`:

| Scope | Rate | Applied to |
|-------|------|-----------|
| `anon` | 10/min | All anonymous endpoints |
| `auth_login` | 5/min | Manager login |
| `auth_signup` | 3/min | Signup |
| `auth_password_reset` | 3/min | Password reset |
| `check_in` | 60/hour | GPS check-in |
| `photo_upload` | 120/hour | Photo upload |
| `webhook` | 1000/day | Outgoing webhooks |
| `manager_dashboard` | 300/hour | Dashboard API |
| `api_key` | 10000/day | Enterprise API keys |

### Nginx — deploy manually

```bash
# Copy rate limiting config
sudo cp deploy/nginx-rate-limiting.conf /etc/nginx/conf.d/

# Add to your server block (see file for exact location blocks)
# Then test and reload:
sudo nginx -t
sudo systemctl reload nginx
```

---

## 3. Backups

### Setup

```bash
# Create backup directory
sudo mkdir -p /var/backups/proofplatform
sudo chown $USER /var/backups/proofplatform

# Test manually
export DATABASE_URL=postgres://user:pass@localhost:5432/proofplatform
./deploy/backup-postgres.sh

# Add to cron (daily at 3 AM)
crontab -e
# Add: 0 3 * * * /opt/proofplatform/deploy/backup-postgres.sh >> /var/log/proofplatform-backup.log 2>&1
```

### Offsite backup (optional)

```bash
# Add to .env:
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_PREFIX=backups/postgres/
# Requires: aws-cli or s3cmd configured with credentials
```

### Restore

```bash
./deploy/restore-postgres.sh /var/backups/proofplatform/proofplatform_20260322_030000.sql.gz
python manage.py migrate
sudo systemctl restart gunicorn
```

---

## 4. Structured Logging

### Configuration

Production uses JSON logging by default (`LOG_FORMAT=json` when `DEBUG=False`).

```bash
# Force text format in production (for debugging)
LOG_FORMAT=text

# Force JSON in development (to test)
LOG_FORMAT=json
```

### JSON output format

```json
{"ts":"2026-03-22T13:45:01.123456+00:00","level":"INFO","logger":"apps.emails","msg":"Email sent: template=verification, to=user@example.com"}
```

### Useful queries

```bash
# Find all email failures
journalctl -u gunicorn | jq 'select(.level == "ERROR" and .logger == "apps.emails")'

# Find Paddle webhook processing
journalctl -u gunicorn | grep '"logger":"apps.api"' | jq 'select(.msg | contains("[paddle]"))'

# Find all errors in last hour
journalctl -u gunicorn --since "1 hour ago" | jq 'select(.level == "ERROR")'
```

---

## Checklist

- [ ] Email SMTP credentials in `.env`
- [ ] `FRONTEND_URL` set to production URL
- [ ] `python manage.py setup_periodic_tasks` run after deploy
- [ ] Nginx rate limiting config installed
- [ ] PostgreSQL backup cron configured
- [ ] Test email delivery from shell
- [ ] Verify JSON logs appear in `journalctl -u gunicorn`
