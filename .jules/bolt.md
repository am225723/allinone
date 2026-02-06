# Performance Journal
\n## Bulk Database Updates\n- **Problem:** Iterating over IDs to update records individually causes N+1 query performance issues.\n- **Solution:** Use Supabase's `.in()` filter to perform bulk updates in a single request.\n- **Verification:** Benchmarking confirmed a reduction from N requests to 1 request. Success tracking is handled via `{ count: 'exact' }` option.
