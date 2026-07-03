"""
test_rls_auth.py
----------------
Standalone script to verify that auth.uid() resolves correctly when using
the user-scoped client pattern (anon key + set_session).

Usage:
    cd backend
    python test_rls_auth.py

You will be prompted for your email and password. The script will:
  1. Sign in with the auth-only client to get a valid JWT.
  2. Create a user-scoped client using the anon key + set_session.
  3. Call debug_auth_context() to check if auth.uid() resolves.
  4. Attempt a direct INSERT into properties to confirm RLS allows it.

Run AFTER applying 008_debug_auth_uid.sql in the Supabase SQL Editor.
"""

import os
import uuid
import sys

# Load .env
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass  # dotenv not required; set env vars manually if needed

from supabase import create_client

SUPABASE_URL      = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set in backend/.env")
    sys.exit(1)

# ------------------------------------------------------------------
# Step 1: sign in
# ------------------------------------------------------------------
email    = input("Manager/owner email: ").strip()
password = input("Password: ").strip()

auth_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
try:
    auth_response = auth_client.auth.sign_in_with_password(
        {"email": email, "password": password}
    )
except Exception as e:
    print(f"Sign-in failed: {e}")
    sys.exit(1)

if not auth_response.session:
    print("Sign-in returned no session — check credentials.")
    sys.exit(1)

access_token  = auth_response.session.access_token
refresh_token = auth_response.session.refresh_token
user_id       = str(auth_response.user.id)
print(f"\nSigned in as: {email}")
print(f"  auth.users.id : {user_id}")
print(f"  access_token  : {access_token[:40]}... (length {len(access_token)})")

# ------------------------------------------------------------------
# Step 2: build user-scoped client
# ------------------------------------------------------------------
user_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
try:
    user_client.auth.set_session(access_token, refresh_token)
    print("\nset_session: OK")
except Exception as e:
    print(f"\nset_session FAILED: {e}")

user_client.postgrest.auth(access_token)
print("postgrest.auth: OK")

# ------------------------------------------------------------------
# Step 3: call debug_auth_context (requires 008_debug_auth_uid.sql)
# ------------------------------------------------------------------
print("\n--- debug_auth_context() ---")
try:
    result = user_client.rpc("debug_auth_context").execute()
    print(f"  Result: {result.data}")
    if result.data:
        row = result.data[0]
        if row.get("auth_uid"):
            print(f"  auth.uid() resolved: {row['auth_uid']}")
            print(f"  actor_id           : {row['actor_id']}")
            print(f"  is_manager_or_owner: {row['is_manager_or_owner']}")
        else:
            print("  auth.uid() is NULL — JWT is NOT propagating correctly!")
    else:
        print("  No rows returned — function may not exist yet (run 008_debug_auth_uid.sql first)")
except Exception as e:
    print(f"  RPC call failed: {e}")

# ------------------------------------------------------------------
# Step 4: look up the actor_id for this user from user_accounts
# ------------------------------------------------------------------
print("\n--- user_accounts lookup (service-role) ---")
svc_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
ua_result = svc_client.table("user_accounts").select("*").eq("auth_user_id", user_id).execute()
if not ua_result.data:
    print(f"  No user_accounts row for auth_user_id={user_id}")
    sys.exit(1)

ua = ua_result.data[0]
actor_id = ua["actor_id"]
role     = ua["role"]
print(f"  actor_id: {actor_id}")
print(f"  role    : {role}")

# ------------------------------------------------------------------
# Step 5: attempt INSERT into properties
# ------------------------------------------------------------------
print("\n--- INSERT into properties (user-scoped client) ---")
test_prop_id = str(uuid.uuid4())
try:
    insert_result = user_client.table("properties").insert({
        "id"           : test_prop_id,
        "name"         : "RLS Test Property",
        "address"      : "123 Test Street",
        "property_type": "apartment_building",
        "unit_count"   : 1,
        "is_active"    : True,
        "created_by"   : actor_id,
    }).execute()
    print(f"  INSERT succeeded: id={insert_result.data[0]['id']}")

    # Clean up
    svc_client.table("properties").delete().eq("id", test_prop_id).execute()
    print("  Test property cleaned up.")
except Exception as e:
    print(f"  INSERT failed: {e}")
    print("\n  Trying with service-role client instead...")
    try:
        insert_result = svc_client.table("properties").insert({
            "id"           : test_prop_id,
            "name"         : "RLS Test Property",
            "address"      : "123 Test Street",
            "property_type": "apartment_building",
            "unit_count"   : 1,
            "is_active"    : True,
            "created_by"   : actor_id,
        }).execute()
        print(f"  Service-role INSERT succeeded: id={insert_result.data[0]['id']}")
        print("\nConclusion: supabase-py cannot propagate user JWT to table INSERT.")
        print("Use service-role client for writes + application-level auth checks.")
        svc_client.table("properties").delete().eq("id", test_prop_id).execute()
        print("  Test property cleaned up.")
    except Exception as e2:
        print(f"  Service-role INSERT also failed: {e2}")
