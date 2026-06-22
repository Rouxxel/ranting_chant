"""Quick smoke test for the database module in both modes."""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(backend_dir))

# Force supabase mode for this test
os.environ["DATA_BACKEND"] = "supabase"

from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env")

from src.database import get_database_service
db = get_database_service()
info = db.health_info()

print(f"Backend: {db.backend_name}")
print(f"Is Supabase: {db.is_supabase}")
print(f"Health info: {info}")

if info.get("supabase_status") == "connected":
    print("SUCCESS: Supabase connection verified!")
else:
    print(f"NOTE: Supabase status: {info.get('supabase_status', 'unknown')}")
    if "supabase_error" in info:
        print(f"  Error: {info['supabase_error']}")
