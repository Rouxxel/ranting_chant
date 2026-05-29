"""Phase 1 backend CRUD, profile, and request workflow tests."""

import asyncio
import json

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from src.api_endpoints.routers import (
    managers_router,
    owners_router,
    properties_router,
    requests_router,
    tenants_router,
    vendors_router,
)
from src.utils import json_store


def make_request(method: str = "GET", path: str = "/test") -> Request:
    """Build a lightweight request object for direct router calls."""
    return Request({"type": "http", "method": method, "path": path})


def write_collection(base_path, collection: str, records: list[dict]) -> None:
    (base_path / f"{collection}.json").write_text(
        json.dumps(records, indent=2),
        encoding="utf-8",
    )


@pytest.fixture()
def temp_store(tmp_path, monkeypatch):
    """Point json_store at isolated temp JSON files for mutation-heavy tests."""
    monkeypatch.setattr(json_store, "_BASE_PATH", tmp_path)
    json_store._locks.clear()

    write_collection(
        tmp_path,
        "properties",
        [
            {
                "id": "property_old",
                "name": "Old House",
                "address": "1 Old St",
                "year_built": 1990,
                "property_type": "apartment_building",
                "unit_count": 10,
                "owner_id": "owner_001",
                "manager_id": "manager_001",
                "tenant_ids": ["tenant_existing"],
                "representative": {"type": "property_manager", "id": "manager_001"},
            },
            {
                "id": "property_new",
                "name": "New House",
                "address": "2 New St",
                "year_built": 2000,
                "property_type": "loft_building",
                "unit_count": 8,
                "owner_id": "owner_002",
                "manager_id": "manager_002",
                "tenant_ids": [],
                "representative": {"type": "property_manager", "id": "manager_002"},
            },
        ],
    )
    write_collection(
        tmp_path,
        "tenants",
        [
            {
                "id": "tenant_existing",
                "name": "Existing Tenant",
                "email": "existing@example.com",
                "phone": "+1",
                "address": "Unit 1",
                "unit": "1A",
                "property_id": "property_old",
            }
        ],
    )
    write_collection(
        tmp_path,
        "vendors",
        [
            {
                "id": "vendor_open",
                "name": "Open Vendor",
                "email": "open@example.com",
                "phone": "+2",
                "services": ["plumbing"],
                "emergency_available": True,
            },
            {
                "id": "vendor_free",
                "name": "Free Vendor",
                "email": "free@example.com",
                "phone": "+3",
                "services": ["hvac"],
                "emergency_available": False,
            },
        ],
    )
    write_collection(
        tmp_path,
        "requests",
        [
            {
                "id": "request_open",
                "requester_id": "tenant_existing",
                "type": "plumbing",
                "description": "Leaking sink",
                "status": "in_progress",
                "urgency": "medium",
                "involved_parties": ["tenant_existing"],
                "conversation_history": [],
                "created_at": "2026-01-01T00:00:00+00:00",
                "updated_at": "2026-01-01T00:00:00+00:00",
                "escalated": False,
                "sentiment": "neutral",
                "confidence": 0.8,
                "vendor_id": "vendor_open",
                "notifications_sent": [],
            },
            {
                "id": "request_pending",
                "requester_id": "tenant_existing",
                "type": "general",
                "description": "Question",
                "status": "pending",
                "urgency": "low",
                "involved_parties": ["tenant_existing"],
                "conversation_history": [],
                "created_at": "2026-01-01T00:00:00+00:00",
                "updated_at": "2026-01-01T00:00:00+00:00",
                "escalated": False,
                "sentiment": "neutral",
                "confidence": 0.5,
                "vendor_id": None,
                "notifications_sent": [],
            },
        ],
    )
    write_collection(
        tmp_path,
        "property_magament",
        [
            {
                "id": "manager_001",
                "name": "Manager One",
                "email": "manager@example.com",
                "phone": "+4",
                "managed_properties": ["property_old"],
            }
        ],
    )
    write_collection(
        tmp_path,
        "owners",
        [
            {
                "id": "owner_001",
                "name": "Owner One",
                "email": "owner@example.com",
                "phone": "+5",
                "owned_properties": ["property_old"],
            }
        ],
    )
    return tmp_path


def test_json_store_create_update_delete(temp_store):
    created = json_store.create_record("vendors", {"id": "vendor_test", "name": "Test"})
    assert created["id"] == "vendor_test"

    updated = json_store.update_record("vendors", "vendor_test", {"phone": "+9"})
    assert updated["phone"] == "+9"

    deleted = json_store.delete_record("vendors", "vendor_test")
    assert deleted["id"] == "vendor_test"
    assert json_store.find_by_id("vendors", "vendor_test") is None


def test_property_create_and_update(temp_store):
    created = asyncio.run(
        properties_router.create_property(
            make_request("POST", "/properties"),
            properties_router.PropertyCreatePayload(
                name="Created Place",
                address="3 Created St",
                year_built=2020,
                property_type="apartment_building",
                unit_count=12,
                owner_id="owner_001",
                manager_id="manager_001",
                tenant_ids=[],
            ),
        )
    )

    assert created["id"].startswith("property_")
    assert created["representative"] == {"type": "property_manager", "id": "manager_001"}

    updated = asyncio.run(
        properties_router.update_property(
            make_request("PATCH", f"/properties/{created['id']}"),
            created["id"],
            properties_router.PropertyUpdatePayload(name="Renamed Place", manager_id="owner_001"),
        )
    )

    assert updated["name"] == "Renamed Place"
    assert updated["representative"] == {"type": "owner", "id": "owner_001"}


def test_tenant_create_update_and_property_relationship_sync(temp_store):
    created = asyncio.run(
        tenants_router.create_tenant(
            make_request("POST", "/tenants"),
            tenants_router.TenantCreatePayload(
                name="New Tenant",
                email="new@example.com",
                phone="+6",
                address="2 New St Unit 2",
                unit="2B",
                property_id="property_new",
            ),
        )
    )

    assert created["id"] in json_store.find_by_id("properties", "property_new")["tenant_ids"]

    updated = asyncio.run(
        tenants_router.update_tenant(
            make_request("PATCH", f"/tenants/{created['id']}"),
            created["id"],
            tenants_router.TenantUpdatePayload(property_id="property_old", unit="1B"),
        )
    )

    assert updated["property_id"] == "property_old"
    assert created["id"] in json_store.find_by_id("properties", "property_old")["tenant_ids"]
    assert created["id"] not in json_store.find_by_id("properties", "property_new")["tenant_ids"]


def test_vendor_create_update_delete_conflict(temp_store):
    created = asyncio.run(
        vendors_router.create_vendor(
            make_request("POST", "/vendors"),
            vendors_router.VendorCreatePayload(
                name="Created Vendor",
                email="created@example.com",
                phone="+7",
                services=["electrical"],
                emergency_available=True,
            ),
        )
    )
    assert created["id"].startswith("vendor_")

    updated = asyncio.run(
        vendors_router.update_vendor(
            make_request("PATCH", f"/vendors/{created['id']}"),
            created["id"],
            vendors_router.VendorUpdatePayload(services=["electrical", "hvac"]),
        )
    )
    assert updated["services"] == ["electrical", "hvac"]

    with pytest.raises(HTTPException) as conflict:
        asyncio.run(
            vendors_router.remove_vendor(
                make_request("DELETE", "/vendors/vendor_open"),
                "vendor_open",
            )
        )
    assert conflict.value.status_code == 409

    deleted = asyncio.run(
        vendors_router.remove_vendor(
            make_request("DELETE", "/vendors/vendor_free"),
            "vendor_free",
        )
    )
    assert deleted["id"] == "vendor_free"


def test_editable_profile_endpoints(temp_store):
    tenant = asyncio.run(
        tenants_router.update_tenant_profile(
            make_request("PATCH", "/tenants/tenant_existing/profile"),
            "tenant_existing",
            tenants_router.TenantProfileUpdatePayload(email="tenant.changed@example.com"),
        )
    )
    assert tenant["email"] == "tenant.changed@example.com"
    assert tenant["property_id"] == "property_old"

    manager = asyncio.run(
        managers_router.update_manager_profile(
            make_request("PATCH", "/managers/manager_001/profile"),
            "manager_001",
            managers_router.ManagerProfileUpdatePayload(phone="+44", department="Operations"),
        )
    )
    assert manager["phone"] == "+44"
    assert manager["department"] == "Operations"

    owner = asyncio.run(
        owners_router.update_owner_profile(
            make_request("PATCH", "/owners/owner_001/profile"),
            "owner_001",
            owners_router.OwnerProfileUpdatePayload(email="owner.changed@example.com"),
        )
    )
    assert owner["email"] == "owner.changed@example.com"


def test_request_cancel_and_complete_workflows(temp_store):
    cancelled = asyncio.run(
        requests_router.cancel_request(
            make_request("POST", "/requests/request_pending/cancel"),
            "request_pending",
            requests_router.RequestCancelPayload(
                cancelled_by="tenant_existing",
                cancellation_reason="No longer needed",
            ),
        )
    )
    assert cancelled["status"] == "cancelled"
    assert cancelled["cancelled_by"] == "tenant_existing"
    assert cancelled["cancellation_reason"] == "No longer needed"
    assert "cancelled_at" in cancelled

    completed = asyncio.run(
        requests_router.complete_request(
            make_request("POST", "/requests/request_open/complete"),
            "request_open",
            requests_router.RequestCompletePayload(
                resolved_by="manager_001",
                resolution_note="Fixed leak",
            ),
        )
    )
    assert completed["status"] == "resolved"
    assert completed["resolved_by"] == "manager_001"
    assert completed["resolution_note"] == "Fixed leak"
    assert "resolved_at" in completed


def test_existing_read_endpoints_still_work(temp_store):
    properties = asyncio.run(properties_router.list_properties(make_request("GET", "/properties")))
    tenants = asyncio.run(tenants_router.list_tenants(make_request("GET", "/tenants"), None))
    vendors = asyncio.run(vendors_router.list_vendors(make_request("GET", "/vendors")))
    requests = asyncio.run(requests_router.list_requests(make_request("GET", "/requests"), None))

    assert len(properties) == 2
    assert len(tenants) == 1
    assert len(vendors) == 2
    assert len(requests) == 2
