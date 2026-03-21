# Preferences

## Verification Commands

Run these commands to validate changes before committing:

```bash
# TypeScript type check
cd dubai-control && npx tsc --noEmit

# Production build
cd dubai-control && npm run build

# E2E smoke tests (62 tests covering all routes)
cd dubai-control && npm run test:e2e
```
