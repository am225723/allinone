# BOLT'S JOURNAL

## 2024-05-22 - PinGuard Performance Optimization
**Learning:** Client-side auth guards in the root layout can accidentally trigger API calls on every navigation if `pathname` is in the dependency array without conditional checks.
**Action:** When implementing client-side guards, cache the authentication state and only invalidate it when necessary (e.g., logging out or visiting login page), rather than re-verifying on every route change.
