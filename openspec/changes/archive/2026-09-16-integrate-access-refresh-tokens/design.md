## Context

The frontend currently uses a single `localStorage.token` key for authentication. The backend has migrated to an access token (15 min TTL) + refresh token (30 day TTL) pattern. The `request()` function in `src/api/client.ts` is the central fetch wrapper used by all API calls. `AuthContext.tsx` manages authentication state and uses `authApi` from client.ts. `Navbar.tsx` calls `logout()` from the auth context.

See proposal.md for full motivation and what changes.

## Goals / Non-Goals

**Goals:**
- Implement token storage with separate `accessToken` and `refreshToken` keys
- Add automatic token refresh in the central `request()` function with deduplication
- Update `authApi.login()`, `authApi.logout()`, and `authApi.me()` to work with new token structure
- Integrate `onAuthExpired` listener in `AuthContext` for session expiry handling
- Make `logout()` async throughout the call chain (authApi → AuthContext → Navbar)
- Preserve existing logging in `request()` and maintain backward compatibility where possible

**Non-Goals:**
- No UI changes (no new components, no modified styles, no new text)
- No changes to protected route logic (`ProtectedRoute` component)
- No changes to other API modules (resources, bookings, calendar)
- No migration of existing user sessions (users will re-login on first visit after deploy)

## Decisions

### 1. Token storage in localStorage (not httpOnly cookies)
**Rationale**: Current architecture uses localStorage for JWT. Backend returns tokens in response body (not Set-Cookie). Switching to cookies would require backend coordination and CSRF protection.
**Alternative considered**: httpOnly cookies with SameSite=Lax — rejected due to backend constraints and scope creep.

### 2. Auto-refresh in central `request()` function
**Rationale**: All API calls go through `request()`. Centralizing refresh logic ensures consistent behavior across all endpoints without modifying each API call site.
**Alternative considered**: Interceptor pattern / Axios-style interceptors — rejected because current codebase uses native fetch with a simple wrapper; adding an interceptor layer would be over-engineering.

### 3. Refresh deduplication via promise sharing (`refreshPromise`)
**Rationale**: Multiple simultaneous 401s (e.g., dashboard loading multiple resources) must not trigger multiple `/auth/refresh` calls. A single shared promise ensures exactly one refresh attempt.
**Alternative considered**: Mutex/lock variable with queue — rejected as more complex for same outcome.

### 4. Direct `fetch` for `/auth/refresh` (not via `request()`)
**Rationale**: Calling `request()` for refresh would create infinite recursion if refresh itself needs refresh. Using raw `fetch` breaks the cycle.
**Alternative considered**: Special flag in `request()` to skip refresh — rejected as more error-prone; raw fetch is simpler and explicit.

### 5. `onAuthExpired` listener pattern for session expiry notification
**Rationale**: `AuthContext` needs to react to session expiry (clear user state) but shouldn't be tightly coupled to `client.ts`. Observer pattern allows clean separation.
**Alternative considered**: Event emitter / custom events — rejected as overkill for single subscriber; simple callback array is sufficient.

### 6. Local logout first, backend logout best-effort
**Rationale**: User experience requires immediate local logout. Backend logout is for token invalidation on server (security hygiene); network failures shouldn't block user from logging out locally.
**Alternative considered**: Wait for backend response before clearing local state — rejected as poor UX on slow/failed networks.

### 7. Clean up legacy `token` key in `clearTokens()`
**Rationale**: Users who logged in before this change will have stale `token` key. Cleaning it prevents confusion and potential bugs from code that might still read it.
**Alternative considered**: Separate migration step — rejected as unnecessary complexity; cleaning on logout/clear is sufficient.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Race condition in `refreshPromise` if multiple tabs | Each tab has own localStorage; `storage` event listener could sync but adds complexity. Acceptable risk: each tab manages its own refresh. |
| Refresh token stolen from localStorage (XSS) | Same risk as current JWT in localStorage. Mitigation: Content Security Policy, httpOnly cookies (future). |
| Infinite loop if `/auth/refresh` returns 401 | `_isRetry` flag prevents retry loop; second 401 propagates error. |
| `onAuthExpired` fires during legitimate logout | `clearTokens()` called in both paths; `notifyAuthExpired()` also calls `clearTokens()`. Idempotent clear is safe. |
| Backend `/auth/logout` failure leaves refresh token valid on server | Low risk: refresh token expires in 30 days anyway. Local logout is primary UX concern. |
| Existing users have stale `token` in localStorage | `clearTokens()` removes it on next logout or session expiry. No active migration needed. |

## Migration Plan

1. Deploy frontend changes (this change)
2. Users with existing sessions will have stale `token` key
3. On first API call after deploy, `getAccessToken()` returns null → 401 → redirect to login
4. User logs in normally → new `accessToken` + `refreshToken` stored
5. Legacy `token` key cleaned up on subsequent logout

No database migration needed. No backward compatibility layer needed (backend already returns both tokens).

## Open Questions

- None — all technical decisions resolved in this design.