# ALABATT-HUB Frontend Handoff

## Current Status

The React/Vite frontend now has a routing foundation and an initial authentication flow against the existing Django JWT API. No backend code or feature-screen workflows were changed.

## Completed

- Added routes for `/login`, `/register`, `/dashboard`, `/membership-plans`, `/memberships`, `/bookings`, `/facilities`, `/equipment`, `/equipment-loans`, `/payments`, `/refunds`, `/notifications`, `/reports`, and `/audit-logs`.
- Public login and registration routes render outside the shared app shell. Application routes use the shared sidebar/header layout and require an authenticated user.
- Added the shared layout, labeled placeholder pages, role-filtered navigation, route-role checks, preserved return-to destination, and sign-out.
- Added login and registration forms. Login accepts username or email. Registration uses username, email, password, first name, last name, and membership category; the backend assigns the role and returns no tokens, so signup directs to login.
- Added a shared API request client with Bearer auth and one refresh/retry on 401, a `sessionStorage` token store, auth endpoint methods, and auth provider/hook. `getReportOverview(accessToken)` now uses the shared client and returns the API result.
- Renamed the frontend API URL variable to `VITE_API_BASE_URL` in `.env` while retaining its configured value.
- Updated the auth layout to use `src/assets/banner.jpg` as the full-height campus image and `src/assets/logo.jpg` centered over it, with the logo also used on mobile. Added an animated “ALABATT HUB” heading with “The Centre for Sport Unit” beneath it; the entrance animation respects reduced-motion preferences. `src/assets/login.jpeg` remains an unused design reference; `src/assets/dashboard.jpeg` is a separate mockup.

## Backend Contract and Decisions

- `POST /api/auth/login/` accepts `{ username, password }` (the username value can be an email) and returns `{ access, refresh, user }`.
- `POST /api/auth/register/` accepts `username`, `email`, `password` (minimum 8 characters), `first_name`, `last_name`, and `category`; Django forces `role=member` and `status=active` and returns user data without tokens.
- `GET /api/auth/me/` returns the current user. `POST /api/auth/token/refresh/` accepts the refresh token and returns an access token.
- For this MVP, JWTs are stored in `sessionStorage`. This is exposed to XSS; HttpOnly refresh-cookie support is deferred because it requires backend changes.
- Frontend route metadata follows inspected Django endpoint permissions; Django remains authoritative. One known discrepancy: current Django notification permissions exclude coaches, while the backend README says coaches can see notifications.
- The backend login view does not visibly reject inactive account status; flag this for backend review if inactive accounts must be blocked.

## Files to Know

- `src/App.jsx` — public and protected route groups.
- `src/utils/appRoutes.js` — route and role/action metadata.
- `src/components/layout/AppLayout.jsx` — authenticated shell, role-filtered navigation, logout.
- `src/components/layout/AuthLayout.jsx` — auth-only visual layout using banner and logo assets.
- `src/features/auth/` — login/register pages, auth context/hook, protected route.
- `src/services/apiClient.js`, `authAPI.js`, `sessionStore.js`, `summaryAPI.js` — shared API and session behavior.
- `src/App.css` — shared shell and auth styles.

## Verification

- `npm run lint` — passed after auth and asset updates.
- `npm run build` — passed; Vite bundled both supplied image assets.
- Backend `python manage.py test accounts` — 6 tests passed. Django reported a non-blocking warning that the configured `staticfiles/` directory is missing.
- Browser smoke checks: `/login` and `/register` render without the app sidebar; unauthenticated `/dashboard` redirects to `/login`; the supplied logo is present in the auth page snapshot.
- Not tested against live credentials: successful/failed login, registration, token refresh, session restoration with real tokens, or role-specific navigation for real users.

## Next Work

- Verify login, registration, refresh, and `/me/` against the deployed backend and its CORS configuration.
- Manually test token restoration, refresh failure, logout, return-to routing, and navigation for each role.
- Check the auth layout at mobile and desktop sizes; adjust after review of the actual rendered banner/logo.
- Consider backend HttpOnly refresh-cookie support and inactive-account handling separately; neither is implemented here.
- Keep this document updated as the implementation advances.
