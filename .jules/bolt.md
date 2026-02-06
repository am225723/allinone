# Performance Learnings

- **N+1 Optimization**: Replaced iterative Supabase `update` calls with a single `.in()` query in `lib/bulk-actions.ts`. Reduced database calls from N to 1.
- **Testing**: Used dependency injection to mock Supabase client for performance verification without external dependencies.
