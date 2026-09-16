## Why

The backend has been updated to use an access token + refresh token pattern (access token expires in 15 minutes, refresh token valid for 30 days). The frontend currently still uses the legacy single-token approach (stored as `localStorage.token`), which means users will be forced to log in again every 15 minutes. This change aligns the frontend with the new backend authentication flow to enable seamless token refresh without user interruption.

## What Changes

- **Token storage**: Replace single `localStorage.token` key with two separate keys: `accessToken` and `refreshToken`; clean up legacy `token` key on logout/clear
- **Auto-refresh mechanism**: Central `request()` function automatically detects 401 on protected endpoints, calls `/auth/refresh` once using the stored refresh token, retries the original request with the new access token
- **Auth API updates**: 
  - `login()` now stores both tokens returned by backend
  - `logout()` becomes async, calls `/auth/logout` with refresh token, clears local tokens first (local logout guaranteed even if backend call fails)
- **AuthContext integration**: Subscribe to `onAuthExpired` listener to clear user state when refresh token is invalid/expired; `logout()` becomes async
- **Navbar update**: `handleLogout` becomes async to await the new async `logout()`

**BREAKING**: `authApi.login()` no longer returns the token (callers must use `authApi.me()` to get user); `authApi.logout()` is now async; `logout` in `AuthContext` and `Navbar` are now async

## Capabilities

### New Capabilities

- `auth-tokens`: Access token + refresh token management including storage, auto-refresh on 401, and session expiry handling

### Modified Capabilities

- `user-auth`: Login/logout flow and authentication state management requirements change to support token refresh and async logout

## Impact

**Affected files:**
- `src/api/client.ts` — Core API layer: token storage helpers, `request()` wrapper with auto-refresh, `authApi` methods
- `src/context/AuthContext.tsx` — Authentication state provider: token validation on load, `onAuthExpired` subscription, async `logout`
- `src/components/Navbar.tsx` — Logout button handler: async `handleLogout`

**Backend dependencies:**
- `POST /auth/login` returns `{ accessToken, refreshToken }`
- `POST /auth/refresh` accepts `{ refreshToken }` returns `{ accessToken }`
- `POST /auth/logout` accepts `{ refreshToken }` returns `{ success: true }`
- Access token TTL: 15 minutes; Refresh token TTL: 30 days