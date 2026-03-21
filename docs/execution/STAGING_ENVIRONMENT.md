# Staging Environment Setup

## Architecture

```
main branch → Vercel Production (app.proofplatform.com)
staging branch → Vercel Preview (staging.proofplatform.com)
```

## How it works

1. **Production**: Push to `main` → auto-deploys to production
2. **Staging**: Push to `staging` → deploys preview with staging env vars
3. **Feature branches**: Create PR → Vercel auto-creates preview URL

## Vercel Configuration

The `vercel.json` file at project root configures:
- Build command pointing to `dubai-control/`
- Routing: SPA fallback for client-side routing
- Headers: security headers for production

## Environment Variables (Vercel Dashboard)

### Production
```
VITE_API_BASE_URL=https://api.proofplatform.com
VITE_SENTRY_DSN=<production DSN>
VITE_SENTRY_ENVIRONMENT=production
VITE_PADDLE_ENVIRONMENT=live
```

### Staging (Preview)
```
VITE_API_BASE_URL=https://api-staging.proofplatform.com
VITE_SENTRY_DSN=<staging DSN>
VITE_SENTRY_ENVIRONMENT=staging
VITE_PADDLE_ENVIRONMENT=sandbox
```

## Workflow

### Normal development
```bash
# Work on feature branch
git checkout -b feat/my-feature
# ... make changes ...
git push origin feat/my-feature
# Create PR → Vercel creates preview URL automatically

# Merge to staging for QA
git checkout staging
git merge feat/my-feature
git push origin staging
# → deploys to staging.proofplatform.com

# After QA passes, merge to main
git checkout main
git merge staging
git push origin main
# → deploys to production
```

### Hotfix
```bash
git checkout main
git checkout -b hotfix/critical-fix
# ... fix ...
git push origin hotfix/critical-fix
# Merge directly to main after review
```

## Backend Staging

Backend staging requires a separate deployment:
- Separate PostgreSQL database
- Separate Redis instance
- Environment variable: `DJANGO_SETTINGS_MODULE=config.settings_staging`
- Same Docker image, different env vars

## CI Integration

The `.github/workflows/ci.yml` runs tests on all branches.
Vercel deployment is triggered by Vercel's GitHub integration, not by CI.
