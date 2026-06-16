"""Smoke test comparing JSON and Supabase repositories outputs for seeded data."""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=backend_dir / ".env")

from src.database.repositories.json_repo import (
    JSONTenantRepository, JSONPropertyRepository, JSONVendorRepository,
    JSONManagerRepository, JSONOwnerRepository, JSONRequestRepository
)
from src.database.repositories.supabase_repo import (
    SupabaseTenantRepository, SupabasePropertyRepository, SupabaseVendorRepository,
    SupabaseManagerRepository, SupabaseOwnerRepository, SupabaseRequestRepository
)
from src.database.supabase_client import get_supabase_client

def test_tenant_repo():
    print("Testing Tenant Repositories...")
    json_repo = JSONTenantRepository()
    sb_repo = SupabaseTenantRepository(get_supabase_client())
    
    # 1. Compare list sizes
    json_list = json_repo.list()
    sb_list = sb_repo.list()
    print(f"  JSON Tenants count: {len(json_list)}")
    print(f"  Supabase Tenants count: {len(sb_list)}")
    
    # 2. Compare b1c4a072-618b-53a2-a16e-d2387c1efa14
    t_id = "b1c4a072-618b-53a2-a16e-d2387c1efa14"
    json_t = json_repo.find_by_id(t_id)
    sb_t = sb_repo.find_by_id(t_id)
    
    assert json_t is not None, "b1c4a072-618b-53a2-a16e-d2387c1efa14 not found in JSON"
    assert sb_t is not None, "b1c4a072-618b-53a2-a16e-d2387c1efa14 not found in Supabase"
    
    # Compare key by key
    for key in ["id", "name", "email", "phone", "address", "unit", "property_id"]:
        val_json = json_t.get(key)
        val_sb = sb_t.get(key)
        assert val_json == val_sb, f"Mismatch on key '{key}': JSON='{val_json}', Supabase='{val_sb}'"
    print("  Tenant b1c4a072-618b-53a2-a16e-d2387c1efa14 matches perfectly!")

def test_property_repo():
    print("Testing Property Repositories...")
    json_repo = JSONPropertyRepository()
    sb_repo = SupabasePropertyRepository(get_supabase_client())

    json_list = json_repo.list()
    sb_list = sb_repo.list()
    print(f"  JSON Properties count: {len(json_list)}")
    print(f"  Supabase Properties count: {len(sb_list)}")

    p_id = "7c76dd08-6949-55f2-a211-9d7a342b8a7d"
    json_p = json_repo.find_by_id(p_id)
    sb_p = sb_repo.find_by_id(p_id)

    assert json_p is not None, f"{p_id} not found in JSON"
    assert sb_p is not None, f"{p_id} not found in Supabase"

    for key in ["id", "name", "address", "year_built", "property_type", "unit_count", "owner_id", "manager_id", "representative"]:
        val_json = json_p.get(key)
        val_sb = sb_p.get(key)
        assert val_json == val_sb, f"Mismatch on key '{key}': JSON='{val_json}', Supabase='{val_sb}'"

    # Compare tenant_ids (unordered)
    assert set(json_p.get("tenant_ids", [])) == set(sb_p.get("tenant_ids", [])), "Property tenant_ids mismatch"
    print(f"  Property {p_id} matches perfectly!")

def test_vendor_repo():
    print("Testing Vendor Repositories...")
    json_repo = JSONVendorRepository()
    sb_repo = SupabaseVendorRepository(get_supabase_client())

    v_id = "fbb4dc23-6e4a-5ee1-9919-e805f4ded107"
    json_v = json_repo.find_by_id(v_id)
    sb_v = sb_repo.find_by_id(v_id)

    assert json_v is not None, f"{v_id} not found in JSON"
    assert sb_v is not None, f"{v_id} not found in Supabase"

    for key in ["id", "name", "email", "phone", "emergency_available"]:
        val_json = json_v.get(key)
        val_sb = sb_v.get(key)
        assert val_json == val_sb, f"Mismatch on key '{key}': JSON='{val_json}', Supabase='{val_sb}'"
    assert set(json_v.get("services", [])) == set(sb_v.get("services", [])), "Vendor services mismatch"
    print(f"  Vendor {v_id} matches perfectly!")

def test_request_repo():
    print("Testing Request Repositories...")
    json_repo = JSONRequestRepository()
    sb_repo = SupabaseRequestRepository(get_supabase_client())

    r_id = "120c6930-919d-5495-bc33-c20e069c03b0"
    json_r = json_repo.find_by_id(r_id)
    sb_r = sb_repo.find_by_id(r_id)

    assert json_r is not None, f"Request {r_id} not found in JSON"
    assert sb_r is not None, f"Request {r_id} not found in Supabase"

    # Compare basic fields
    for key in ["id", "requester_id", "type", "description", "status", "urgency", "escalated", "sentiment", "confidence", "vendor_id", "property_id", "property", "summary", "resolved_by", "resolution_note"]:
        val_json = json_r.get(key)
        val_sb = sb_r.get(key)
        assert val_json == val_sb, f"Mismatch on key '{key}': JSON='{val_json}', Supabase='{val_sb}'"

    assert set(json_r.get("involved_parties", [])) == set(sb_r.get("involved_parties", [])), "Involved parties mismatch"

    # Compare conversation history turns (ignore exact timestamps syntax, compare content and role)
    json_history = json_r.get("conversation_history", [])
    sb_history = sb_r.get("conversation_history", [])
    assert len(json_history) == len(sb_history), f"Conversation history length mismatch: JSON={len(json_history)}, Supabase={len(sb_history)}"
    for jt, st in zip(json_history, sb_history):
        assert jt.get("role") == st.get("role"), "Role mismatch in message"
        assert jt.get("message") == st.get("message"), "Message content mismatch"

    print(f"  Request {r_id} matches perfectly!")

if __name__ == "__main__":
    try:
        test_tenant_repo()
        test_property_repo()
        test_vendor_repo()
        test_request_repo()
        print("ALL TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"TEST FAILURE: {e}")
        sys.exit(1)
