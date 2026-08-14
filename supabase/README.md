# Supabase migrations

These files mirror migrations applied to the production project
(`fxbkfrmbfyhlvgiwpsrk`). They are the **start** of tracking schema + RLS in
version control — previously the schema lived only in the dashboard (no history,
no review, no CI).

## Important: the baseline is not captured yet

The migrations here only cover changes made from **2026-08-09 onward** (the
launch-audit hardening). Every table, policy, function, and index that existed
**before** that is live in production but **not** represented in this folder.

To capture the full baseline, run once (requires the Supabase CLI + the DB
password):

```bash
supabase login
supabase link --project-ref fxbkfrmbfyhlvgiwpsrk
supabase db pull                 # writes a baseline migration of the CURRENT schema
supabase migration list          # local vs remote should line up after this
```

After `db pull`, the generated baseline plus these files together describe the
whole schema, and future changes should go through
`supabase migration new <name>` → edit SQL → `supabase db push` rather than the
dashboard.

## Migrations in this folder

| Version | Name | What it does |
|---------|------|--------------|
| 20260809150428 | enable_rls_cached_lesson_intros | Close the one RLS-disabled public table |
| 20260809150630 | quick_score_daily_usage_cap | Durable global budget cap for public quick-score |
| 20260814124314 | harden_trigger_function_search_paths | Pin search_path; lock down handle_new_user RPC |
| 20260814124608 | optimize_rls_auth_uid_initplan | `(select auth.uid())` + drop duplicate sessions policies |
| 20260814124657 | drop_duplicate_user_progress_index | Remove identical duplicate index |
