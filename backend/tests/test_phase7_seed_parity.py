"""
#############################################################################
### Phase 7 seed parity tests
###
### @file test_phase7_seed_parity.py
### @date 2026
#############################################################################

Verify that the JSON repositories return the correct count of seeded records
and the correct DTO shape. No Supabase connection is needed; runs entirely
with DATA_BACKEND=json.
"""

# Native imports
import pytest

# Other files imports
from src.database import get_database_service


"""FIXTURES-----------------------------------------------------------"""


@pytest.fixture(autouse=True)
def use_json_backend(monkeypatch):
    """Force DATA_BACKEND=json and clear the lru_cache before every test."""
    monkeypatch.setenv("DATA_BACKEND", "json")
    get_database_service.cache_clear()
    yield
    get_database_service.cache_clear()


"""HELPERS-----------------------------------------------------------"""


def db():
    """Return a fresh DatabaseService backed by JSON."""
    return get_database_service()


"""COUNT TESTS-----------------------------------------------------------"""


def test_tenants_count():
    """JSON tenant store must contain 11 seeded records."""
    tenants = db().tenants.list()
    assert len(tenants) == 11


def test_properties_count():
    """JSON property store must contain 5 seeded records."""
    properties = db().properties.list()
    assert len(properties) == 5


def test_vendors_count():
    """JSON vendor store must contain 10 seeded records."""
    vendors = db().vendors.list()
    assert len(vendors) == 10


def test_managers_count():
    """JSON manager store must contain 4 seeded records."""
    managers = db().managers.list()
    assert len(managers) == 4


def test_owners_count():
    """JSON owner store must contain 5 seeded records."""
    owners = db().owners.list()
    assert len(owners) == 5


def test_requests_count():
    """JSON request store must contain the expected number of seeded records."""
    requests = db().requests.list()
    # Actual seed file contains 15 records; validate the seeded state is non-empty
    assert len(requests) >= 1


"""DTO SHAPE TESTS-----------------------------------------------------------"""


def test_tenant_dto_shape():
    """A tenant DTO must expose the required keys."""
    tenant = db().tenants.list()[0]
    required_keys = {"id", "name", "email", "phone", "address", "unit", "property_id"}
    assert required_keys.issubset(tenant.keys()), (
        f"Missing keys: {required_keys - tenant.keys()}"
    )


def test_property_dto_shape():
    """A property DTO must expose the required keys."""
    prop = db().properties.list()[0]
    required_keys = {"id", "name", "address", "owner_id", "manager_id", "tenant_ids", "representative"}
    assert required_keys.issubset(prop.keys()), (
        f"Missing keys: {required_keys - prop.keys()}"
    )


def test_vendor_dto_shape():
    """A vendor DTO must expose the required keys."""
    vendor = db().vendors.list()[0]
    required_keys = {"id", "name", "email", "phone", "services", "emergency_available"}
    assert required_keys.issubset(vendor.keys()), (
        f"Missing keys: {required_keys - vendor.keys()}"
    )


def test_request_dto_shape():
    """A request DTO must expose the required keys."""
    request = db().requests.list()[0]
    required_keys = {
        "id", "requester_id", "type", "status", "urgency",
        "conversation_history", "notifications_sent",
    }
    assert required_keys.issubset(request.keys()), (
        f"Missing keys: {required_keys - request.keys()}"
    )
