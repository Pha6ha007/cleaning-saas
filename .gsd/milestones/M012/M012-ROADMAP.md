---
id: M012
title: Mobile Cleaner App — Profile Screen
status: complete
started: 2026-03-17
completed: 2026-03-17
tests_at_start: 845
tests_at_end: 845
mobile_tests_at_start: 28
mobile_tests_at_end: 37
---

## Deliverables

### S01: Profile Screen + fetchMe
- `CleanerProfile` type + `fetchMe()` → `GET /api/me/` added to `client.ts`
- `ProfileScreen.tsx` — name, email, role, company, avatar initial, logout
- `App.tsx` — `Profile` route added to `RootStackParamList` + Stack
- `JobsScreen` — header button changed from inline Logout → Profile navigation
- 9 new Jest tests (`ProfileScreen.test.tsx` + `fetchMe.test.ts`)
- Mobile: 28 → 37 tests
