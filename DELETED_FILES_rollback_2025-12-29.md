Rollback note — files to be deleted on 2025-12-29

I will delete the following files to reduce the app to only `/login` and `/tracker` flows. If you want to revert, restore these from git or copy from this list.

App pages (removed):
- app/auth/error/page.tsx — old nested auth error page (removed)
- app/auth/forgot-password/page.tsx — removed
- app/auth/update-password/page.tsx — removed
- app/auth/confirm/route.ts — removed
- app/auth/sign-up-success/page.tsx — removed
- app/auth/sign-up/page.tsx — removed
- app/auth/login/page.tsx — removed (keep top-level `app/login/page.tsx` instead)
- app/protected/layout.tsx — removed
- app/protected/page.tsx — removed
- app/about-us/page.tsx — removed

Components (removed):
- components/deploy-button.tsx — removed
- components/auth-button.tsx — removed
- components/sign-up-form.tsx — removed
- components/logout-button.tsx — removed
- components/update-password-form.tsx — removed
- components/forgot-password-form.tsx — removed

Notes:
- Kept: `app/login/page.tsx` (top-level login), `app/tracker/page.tsx`, `components/login-form.tsx`, `components/trackerapp.tsx`, `components/entrymodal.tsx`, and `components/ui/*`.
- After deletion, run `npm run lint -- --fix` and `npm run build`. Remove `.next` cache if needed (`rm -rf .next`).

If you'd like a branch created or a backup before deleting, tell me and I'll make a quick copy first.
