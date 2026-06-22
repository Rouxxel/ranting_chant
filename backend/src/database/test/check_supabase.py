
from dotenv import load_dotenv
import os
from pathlib import Path
import sys

# Get the backend directory (4 levels up from test directory)
backend_dir = Path(__file__).resolve().parent.parent.parent.parent
src_dir = backend_dir / "src"
load_dotenv(dotenv_path=backend_dir / ".env")

# Add both backend and src directories to sys.path
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(src_dir))

from database.supabase_client import get_supabase_client

client = get_supabase_client()

print("Checking tenants table:")
res1 = client.table("tenants").select("*").execute()
print(f"Tenants (no filter): {len(res1.data)}")
for t in res1.data:
    print(f"  - {t}")

print("\nChecking actors table:")
res2 = client.table("actors").select("*").execute()
print(f"Actors: {len(res2.data)}")
for a in res2.data:
    print(f"  - {a}")
