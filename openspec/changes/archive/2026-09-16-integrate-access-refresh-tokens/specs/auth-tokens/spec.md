## Purpose

Manages access token and refresh token lifecycle including secure storage, automatic token refresh on expiry, session expiry detection, and logout coordination with the backend.

## ADDED Requirements

### Requirement: Access token and refresh token are stored separately in localStorage
The system SHALL store the access token under `localStorage.accessToken` and the refresh token under `localStorage.refreshToken`. The legacy `localStorage.token` key SHALL be removed when tokens are cleared.

#### Scenario: Login stores both tokens
- **WHEN** user successfully logs in via `/auth/login`
- **THEN** `accessToken` and `refreshToken` are stored in localStorage
- **AND** legacy `token` key is not used

#### Scenario: Logout clears both tokens and legacy key
- **WHEN** user logs out
- **THEN** `accessToken`, `refreshToken`, and legacy `token` keys are all removed from localStorage

### Requirement: Automatic access token refresh on 401 response
The system SHALL automatically request a new access token via `/auth/refresh` when a protected API request returns 401, then retry the original request once with the new token.

#### Scenario: Successful token refresh and request retry
- **WHEN** a protected API request returns 401 and a valid refresh token exists
- **THEN** system calls `/auth/refresh` with the refresh token
- **AND** on success, stores the new access token
- **AND** retries the original request with the new access token
- **AND** returns the successful response to the caller

#### Scenario: Failed refresh triggers session expiry
- **WHEN** a protected API request returns 401 and `/auth/refresh` fails (invalid/expired refresh token)
- **THEN** system clears all tokens from localStorage
- **AND** notifies all registered auth-expiry listeners
- **AND** the original 401 error is propagated to the caller

#### Scenario: Concurrent 401 requests share single refresh call
- **WHEN** multiple protected requests simultaneously receive 401
- **THEN** only ONE `/auth/refresh` call is made
- **AND** all waiting requests use the same new access token
- **AND** all requests retry and complete

#### Scenario: Auth endpoints do not trigger auto-refresh
- **WHEN** `/auth/login`, `/auth/register`, or `/auth/refresh` returns 401
- **THEN** no auto-refresh is attempted
- **AND** the 401 error is immediately propagated to the caller

#### Scenario: Maximum one retry after refresh
- **WHEN** a request is retried with a fresh access token and still returns 401
- **THEN** no further refresh attempt is made
- **AND** the 401 error is propagated to the caller

### Requirement: Auth expiry listeners are notified when session ends
The system SHALL provide a mechanism for components to register callbacks that are invoked when the refresh token is invalid or expired (session definitively ended).

#### Scenario: AuthContext clears user on session expiry
- **WHEN** `onAuthExpired` callback is invoked
- **THEN** authentication state is cleared (user set to null)
- **AND** user is effectively logged out

### Requirement: Logout calls backend and clears local tokens
The system SHALL call `/auth/logout` with the refresh token when user logs out, but local token clearing SHALL happen first and SHALL NOT be blocked by backend failures.

#### Scenario: Logout clears local tokens before backend call
- **WHEN** user initiates logout
- **THEN** `accessToken`, `refreshToken`, and legacy `token` are immediately removed from localStorage
- **AND** `/auth/logout` is called with the refresh token
- **AND** even if backend call fails, user remains logged out locally

#### Scenario: Logout succeeds without refresh token
- **WHEN** user logs out but no refresh token exists in storage
- **THEN** local tokens are cleared
- **AND** no backend call is made
- **AND** logout completes successfully