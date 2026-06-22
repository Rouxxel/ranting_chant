"""
#############################################################################
### Phase 7 JSON CRUD tests
###
### @file test_phase7_json_crud.py
### @date 2026
#############################################################################

CRUD tests for the JSON repository layer. No Supabase connection required;
all tests run with DATA_BACKEND=json and operate through the DatabaseService
repository interfaces.

Tasks E (list/find) and F (create/update, no-op history calls) are both
included here.
"""

# Native imports
import json
import uuid
from datetime import datetime, timezone

import pytest

# Other files imports
from src.database import get_database_service
from src.utils import json_store


"""FIXTURES-----------------------------------------------------------"""


@pytest.fixture(autouse=True)
def use_json_backend(monkeypatch):
    """Force DATA_BACKEND=json and clear the lru_cache before every test."""
    monkeypatch.setenv("DATA_BACKEND", "json")
    get_database_service.cache_clear()
    yield
    get_database_service.cache_clear()


@pytest.fixture()
def temp_store(tmp_path, monkeypatch):
    """
    Redirect json_store._BASE_PATH to an isolated temp directory with a
    minimal seeded dataset for mutation-heavy tests.
    """
    monkeypatch.setattr(json_store, "_BASE_PATH", tmp_path)
    json_store._locks.clear()
    get_database_service.cache_clear()

    # Seed minimal data for CRUD tests
    (tmp_path / "tenants.json").write_text(
        json.dumps([
            {
                "id": "tenant_crud_001",
                "name": "CRUD Tenant",
                "email": "crud@gmail.com",
                "phone": "+16505551111",
                "address": "1 CRUD St",
                "unit": "1A",
                "property_id": "property_crud_001",
            }
        ], indent=2),
        encoding="utf-8",
    )
    (tmp_path / "properties.json").write_text(
        json.dumps([
            {
                "id": "property_crud_001",
                "name": "CRUD Property",
                "address": "1 Prop St",
                "owner_id": "owner_crud_001",
                "manager_id": "manager_crud_001",
                "tenant_ids": ["tenant_crud_001"],
                "representative": {"type": "property_manager", "id": "manager_crud_001"},
            }
        ], indent=2),
        encoding="utf-8",
    )
    (tmp_path / "vendors.json").write_text(
        json.dumps([
            {
                "id": "vendor_crud_001",
                "name": "CRUD Vendor",
                "email": "vendor@gmail.com",
                "phone": "+16505552222",
                "services": ["plumbing"],
                "emergency_available": True,
            },
            {
                "id": "vendor_crud_002",
                "name": "CRUD Vendor 2",
                "email": "vendor2@gmail.com",
                "phone": "+16505553333",
                "services": ["electrical"],
                "emergency_available": False,
            },
        ], indent=2),
        encoding="utf-8",
    )
    (tmp_path / "requests.json").write_text(
        json.dumps([
            {
                "id": "request_crud_001",
                "requester_id": "tenant_crud_001",
                "type": "plumbing",
                "description": "Leaking pipe",
                "status": "pending",
                "urgency": "medium",
                "involved_parties": ["tenant_crud_001"],
                "conversation_history": [],
                "created_at": "2026-01-01T00:00:00+00:00",
                "updated_at": "2026-01-01T00:00:00+00:00",
                "escalated": False,
                "sentiment": "neutral",
                "confidence": 0.8,
                "vendor_id": None,
                "notifications_sent": [],
            },
            {
                "id": "request_crud_002",
                "requester_id": "tenant_crud_001",
                "type": "general",
                "description": "A question",
                "status": "in_progress",
                "urgency": "low",
                "involved_parties": ["tenant_crud_001"],
                "conversation_history": [],
                "created_at": "2026-01-01T00:00:00+00:00",
                "updated_at": "2026-01-01T00:00:00+00:00",
                "escalated": False,
                "sentiment": "neutral",
                "confidence": 0.5,
                "vendor_id": "vendor_crud_001",
                "notifications_sent": [],
            },
        ], indent=2),
        encoding="utf-8",
    )
    (tmp_path / "managers.json").write_text(
        json.dumps([
            {
                "id": "manager_crud_001",
                "name": "CRUD Manager",
                "email": "manager@gmail.com",
                "phone": "+16505554444",
                "managed_properties": ["property_crud_001"],
            }
        ], indent=2),
        encoding="utf-8",
    )
    (tmp_path / "owners.json").write_text(
        json.dumps([
            {
                "id": "owner_crud_001",
                "name": "CRUD Owner",
                "email": "owner@gmail.com",
                "phone": "+16505555555",
                "owned_properties": ["property_crud_001"],
            }
        ], indent=2),
        encoding="utf-8",
    )
    return tmp_path


"""TASK E — LIST AND FIND TESTS-----------------------------------------------------------"""


def test_tenant_list_and_find():
    """List all tenants from seed data and find one by ID; assert DTO shape."""
    db = get_database_service()
    tenants = db.tenants.list()
    assert len(tenants) >= 1

    first = tenants[0]
    found = db.tenants.find_by_id(first["id"])
    assert found is not None
    assert found["id"] == first["id"]

    # DTO shape
    for key in ("id", "name", "email", "phone", "address", "unit", "property_id"):
        assert key in found, f"Missing key '{key}' in tenant DTO"


def test_property_list_and_find():
    """List all properties from seed data and find one by ID; assert DTO shape."""
    db = get_database_service()
    properties = db.properties.list()
    assert len(properties) >= 1

    first = properties[0]
    found = db.properties.find_by_id(first["id"])
    assert found is not None
    assert found["id"] == first["id"]

    for key in ("id", "name", "address", "owner_id", "manager_id", "tenant_ids", "representative"):
        assert key in found, f"Missing key '{key}' in property DTO"


def test_vendor_list_and_find():
    """List all vendors from seed data and find one by ID; assert DTO shape."""
    db = get_database_service()
    vendors = db.vendors.list()
    assert len(vendors) >= 1

    first = vendors[0]
    found = db.vendors.find_by_id(first["id"])
    assert found is not None
    assert found["id"] == first["id"]

    for key in ("id", "name", "email", "phone", "services", "emergency_available"):
        assert key in found, f"Missing key '{key}' in vendor DTO"


def test_request_list_and_find():
    """List all requests from seed data and find one by ID; assert DTO shape."""
    db = get_database_service()
    requests = db.requests.list()
    assert len(requests) >= 1

    first = requests[0]
    found = db.requests.find_by_id(first["id"])
    assert found is not None
    assert found["id"] == first["id"]

    for key in ("id", "requester_id", "type", "status", "urgency",
                "conversation_history", "notifications_sent"):
        assert key in found, f"Missing key '{key}' in request DTO"


def test_request_find_by_requester(temp_store):
    """find_by_field on requester_id returns only requests for that tenant."""
    db = get_database_service()
    results = db.requests.find_by_field("requester_id", "tenant_crud_001")
    assert len(results) == 2
    for r in results:
        assert r["requester_id"] == "tenant_crud_001"


def test_vendor_find_by_field(temp_store):
    """find_by_field on emergency_available=True returns only emergency vendors."""
    db = get_database_service()
    results = db.vendors.find_by_field("emergency_available", True)
    assert len(results) >= 1
    for v in results:
        assert v["emergency_available"] is True


"""TASK F — CREATE/UPDATE AND NO-OP TESTS-----------------------------------------------------------"""


def test_request_create_and_update(temp_store):
    """Create a request record then update its status; assert the change persists."""
    db = get_database_service()
    now = datetime.now(timezone.utc).isoformat()
    new_id = f"request_{uuid.uuid4().hex[:8]}"

    record = {
        "id": new_id,
        "requester_id": "tenant_crud_001",
        "type": "general",
        "description": "Test create request",
        "status": "pending",
        "urgency": "low",
        "involved_parties": [],
        "conversation_history": [],
        "created_at": now,
        "updated_at": now,
        "escalated": False,
        "sentiment": "neutral",
        "confidence": 0.0,
        "vendor_id": None,
        "notifications_sent": [],
    }

    created = db.requests.create(record)
    assert created["id"] == new_id
    assert created["status"] == "pending"

    updated = db.requests.update(new_id, {"status": "in_progress", "updated_at": now})
    assert updated["status"] == "in_progress"

    # Confirm persisted
    fetched = db.requests.find_by_id(new_id)
    assert fetched["status"] == "in_progress"


def test_request_status_history_noop_json(temp_store):
    """record_status_history on JSON backend is a no-op — should not raise."""
    db = get_database_service()
    # Should complete without raising any exception
    db.requests.record_status_history(
        "request_crud_001",
        old_status="pending",
        new_status="in_progress",
        changed_by="manager_crud_001",
        notes="Acknowledged",
    )


def test_request_vendor_assignment_noop_json(temp_store):
    """record_vendor_assignment on JSON backend is a no-op — should not raise."""
    db = get_database_service()
    # Should complete without raising any exception
    db.requests.record_vendor_assignment(
        "request_crud_001",
        vendor_id="vendor_crud_001",
        assigned_by="manager_crud_001",
    )
