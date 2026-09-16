## 1. Token Storage Helpers in client.ts

- [x] 1.1 Replace `getToken()` with `getAccessToken()`, `getRefreshToken()`, `setTokens()`, `clearTokens()` and verify functions exist by inspecting the file
- [x] 1.2 Update all internal references from `getToken()` to `getAccessToken()` in client.ts and verify no `getToken` calls remain

## 2. Auto-Refresh Mechanism in request()

- [x] 2.1 Add `refreshPromise` variable, `refreshAccessToken()`, `onAuthExpired()`, `notifyAuthExpired()`, and `authExpiredListeners` array above `request()` function and verify they are exported/accessible
- [x] 2.2 Modify `request()` to accept `_isRetry` parameter, detect 401 on non-auth endpoints, call `refreshAccessToken()`, retry once, and verify the logic integrates with existing error handling (logging, error throwing) without duplication
- [x] 2.3 Ensure auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`) are excluded from auto-refresh logic and verify by code inspection

## 3. authApi Updates

- [x] 3.1 Update `authApi.login()` to store both `accessToken` and `refreshToken` via `setTokens()` and verify it no longer returns the token
- [x] 3.2 Update `authApi.logout()` to be async, clear tokens first via `clearTokens()`, then call `/auth/logout` with refresh token (best-effort), and verify error handling doesn't block local logout
- [x] 3.3 Verify `authApi.me()` and `authApi.register()` remain unchanged and still work

## 4. AuthContext Integration

- [x] 4.1 Import `onAuthExpired` from `../api/client` in AuthContext.tsx
- [x] 4.2 Add `useEffect` in `AuthProvider` to subscribe to `onAuthExpired` and call `setUser(null)` on expiry, and verify subscription cleanup on unmount
- [x] 4.3 Make `logout()` async to await `authApi.logout()` and verify it compiles and type-checks
- [x] 4.4 Verify `login()` and `register()` still work (they call `authApi.me()` after login which should work with new token structure)

## 5. Navbar Update

- [x] 5.1 Make `handleLogout()` async and `await logout()` before `navigate("/login")`, and verify no TypeScript errors

## 6. Verification & Testing

- [x] 6.1 Run `npm run build` and verify TypeScript compilation succeeds with no errors
- [x] 6.2 Run `npm run test` and verify all unit/component tests pass
- [x] 6.3 Manual test: Login normally → verify `accessToken` and `refreshToken` in localStorage (DevTools Application tab)
- [x] 6.4 Manual test: Set backend access token TTL to 10 seconds (temporary), wait for expiry, access `/my-bookings` → verify auto-refresh works silently (no redirect to login)
- [x] 6.5 Manual test: Click "Keluar" (logout) → verify redirect to `/login`, localStorage cleared, accessing `/my-bookings` redirects to login
- [x] 6.6 Manual test: Delete `refreshToken` from localStorage, wait for access token expiry (or set backend TTL low), access protected page → verify redirect to login (not infinite loading/error)