# RLS Troubleshooting Guide

Reference guide for diagnosing and resolving Row Level Security (RLS) violations in the Ranting Chant backend.

---

## Quick Reference

| Symptom | Most likely cause | Fix |
|---|---|---|
| `42501` on INSERT after login | Service-role singleton contaminated by `sign_in_with_password` call | Use `get_auth_client()` for all auth operations |
| `42501` on INSERT without prior login | No service-role bypass policy on the table | Add `service_role` bypass policy in `002_rls_policies.sql` |
| `current_actor_id()` returns NULL | No `user_accounts` row for the auth user | Check `user_accounts` table mapping |
| `auth.uid()` returns NULL in RPC | JWT not propagated to user-scoped client | Use `set_session` + `postgrest.auth` on anon-key client |
| `auth.uid()` works in RPC but not in table INSERT | `supabase-py` limitation with user-scoped clients | Use service-role client for writes; enforce auth in FastAPI |

---

## Error Code Reference

`{'code': '42501', 'message': 'new row violates row-level security policy for table "X"'}`

This is PostgreSQL's error for an RLS policy rejecting an INSERT, UPDATE, or DELETE. It means either:
1. No policy grants INSERT/UPDATE/DELETE to the current database role, or
2. A policy's `WITH CHECK` expression evaluated to `false` for the row being written.

---

## Root Causes

### 1. Service-role singleton session contamination

**What happens**: `auth.sign_in_with_password()` is called on the shared service-role client. This replaces the singleton's internal JWT with the user's session token. Subsequent table operations on the same singleton then run under the user's RLS context instead of bypassing RLS as service-role.

**Symptom**: Works correctly on first startup; starts failing after the first user logs in, often intermittently.

**Fix**: Use `get_auth_client()` for all auth operations:

```python
from src.database.supabase_client import get_auth_client

# Correct
auth_client = get_auth_client()
response = auth_client.auth.sign_in_with_password({"email": ..., "password": ...})

# Wrong — contaminates the service-role singleton
supabase.auth.sign_in_with_password({"email": ..., "password": ...})
```

The same applies to `sign_out()`, `refresh_session()`, `set_session()`, and `update_user()`.

---

### 2. Missing service-role bypass policy

**What happens**: A table has RLS enabled but no policy granting INSERT to `service_role`. The service-role key normally bypasses RLS, but only if `BYPASSRLS` is set on the role or a permissive policy allows it.

**Symptom**: `42501` on a specific table even though the singleton is clean.

**Fix**: Add a bypass policy in `002_rls_policies.sql` (for base tables) or `004_schema_hardening.sql` (for hardening tables):

```sql
DROP POLICY IF EXISTS "Service role can bypass X RLS" ON X;
CREATE POLICY "Service role can bypass X RLS"
    ON X FOR ALL TO service_role
    USING (true) WITH CHECK (true);
```

---

### 3. `current_actor_id()` returns NULL

**What happens**: The RLS helper function can't find a `user_accounts` row matching `auth.uid()`, so it returns NULL. All policies that call `current_actor_id()` or `current_actor_is_manager_or_owner()` then fail.

**Diagnostic query** (run in Supabase SQL Editor):
```sql
-- Check if the auth user has a user_accounts mapping
SELECT ua.*, a.type, a.display_name, a.is_active
FROM user_accounts ua
JOIN actors a ON a.id = ua.actor_id
WHERE ua.auth_user_id = '<your-auth-user-uuid>';
```

**Common causes**:
- Signup completed but `user_accounts` insert failed (check signup logs)
- Actor `is_active = false`
- `user_accounts.role` is something other than `'owner'` or `'manager'`

---

### 4. `supabase-py` user-scoped client limitation

**What happens**: A user-scoped client is created with `client.auth.set_session(token, token)` and `client.postgrest.auth(token)`. RPC calls work correctly (`auth.uid()` resolves), but table INSERT/UPDATE/DELETE operations still fail with `42501`.

**Root cause**: In `supabase-py`, `postgrest-py` (which handles table operations) and the auth client are separate internal subsystems. When constructing a fresh client per request, the session set via `auth.set_session()` does not fully propagate to the PostgREST table operations layer in all library versions.

**Confirmed behavior** (from `test_rls_auth.py`):
- `client.rpc("debug_auth_context")` → `auth.uid()` resolves correctly ✅
- `client.table("properties").insert(...)` → `42501` ❌

**Fix**: Use the service-role client for all server-side writes. The FastAPI `require_manager_or_owner` dependency validates the JWT before the route handler runs — that is the authorization check. Database-level RLS is a safety net for direct/client-side access, not for trusted server-side writes.

---

## Diagnostic Tools

### Test script

`backend/test_rls_auth.py` signs in with real credentials and tests both RPC and table INSERT with a user-scoped client:

```bash
cd backend
python test_rls_auth.py
```

It will tell you:
- Whether `auth.uid()` resolves via `debug_auth_context()` RPC
- Whether a direct table INSERT succeeds with the user-scoped client
- Whether the service-role client can INSERT (baseline check)

### SQL debug functions

`002_rls_policies.sql` defines two helpers you can call from any Supabase client:

```sql
-- SECURITY DEFINER: runs as postgres, bypasses RLS on user_accounts lookup
SELECT * FROM debug_auth_context();
-- Returns: auth_uid, actor_id, is_manager_or_owner

-- SECURITY INVOKER: runs as the caller's PostgreSQL role
SELECT * FROM debug_auth_context_caller();
-- Returns: auth_uid, current_role
-- If auth_uid is NULL here, the JWT is not reaching PostgreSQL at all
```

### Policy inspection query

Run in the Supabase SQL Editor to see all policies on a table:

```sql
SELECT policyname, cmd, roles, qual::text, with_check::text
FROM pg_policies
WHERE tablename = 'properties'
ORDER BY cmd, policyname;
```

### Check RLS enabled/disabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Migration File Reference

| File | Responsibility |
|---|---|
| `002_rls_policies.sql` | Auth helper functions, all base table RLS policies, service-role bypass for base tables, corrected INSERT policies, debug helpers |
| `004_schema_hardening.sql` | RLS policies for hardening tables, service-role bypass for `user_accounts`, `request_attachments`, `request_status_history`, `request_assignments` |
| `005_user_accounts_mapping.sql` | Seed `user_accounts` rows mapping auth UUIDs to actor UUIDs |

---

## Pattern: Adding a New Protected Table

When adding a new table that requires RLS:

1. Enable RLS in the table definition or via `ALTER TABLE X ENABLE ROW LEVEL SECURITY`.
2. Add user-facing policies (SELECT, INSERT, UPDATE, DELETE) as needed.
3. Add a service-role bypass policy so the FastAPI backend can write to it:

```sql
-- In 002_rls_policies.sql (if base table) or 004_schema_hardening.sql (if hardening table)
DROP POLICY IF EXISTS "Service role can bypass X RLS" ON X;
CREATE POLICY "Service role can bypass X RLS"
    ON X FOR ALL TO service_role
    USING (true) WITH CHECK (true);
```

4. Test with `test_rls_auth.py` or the debug helper functions.
