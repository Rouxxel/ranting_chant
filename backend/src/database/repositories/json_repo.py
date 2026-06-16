"""
json_repo.py

JSON-backed concrete implementations of the repository interfaces.
"""

from typing import Any, Dict, List, Optional
from src.utils import json_store
from src.database.repositories.base import (
    BaseTenantRepository,
    BasePropertyRepository,
    BaseVendorRepository,
    BaseManagerRepository,
    BaseOwnerRepository,
    BaseRequestRepository,
)


class JSONTenantRepository(BaseTenantRepository):
    def list(self) -> List[Dict[str, Any]]:
        return json_store.read_all("tenants")

    def find_by_id(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        return json_store.find_by_id("tenants", tenant_id)

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        return json_store.find_by_field("tenants", field, value)

    def create(self, data: dict) -> Dict[str, Any]:
        return json_store.create_record("tenants", data)

    def update(self, tenant_id: str, updates: dict) -> Dict[str, Any]:
        return json_store.update_record("tenants", tenant_id, updates)

    def delete(self, tenant_id: str) -> Dict[str, Any]:
        return json_store.delete_record("tenants", tenant_id)


class JSONPropertyRepository(BasePropertyRepository):
    def list(self) -> List[Dict[str, Any]]:
        return json_store.read_all("properties")

    def find_by_id(self, property_id: str) -> Optional[Dict[str, Any]]:
        return json_store.find_by_id("properties", property_id)

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        return json_store.find_by_field("properties", field, value)

    def create(self, data: dict) -> Dict[str, Any]:
        return json_store.create_record("properties", data)

    def update(self, property_id: str, updates: dict) -> Dict[str, Any]:
        return json_store.update_record("properties", property_id, updates)

    def delete(self, property_id: str) -> Dict[str, Any]:
        return json_store.delete_record("properties", property_id)


class JSONVendorRepository(BaseVendorRepository):
    def list(self) -> List[Dict[str, Any]]:
        return json_store.read_all("vendors")

    def find_by_id(self, vendor_id: str) -> Optional[Dict[str, Any]]:
        return json_store.find_by_id("vendors", vendor_id)

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        return json_store.find_by_field("vendors", field, value)

    def create(self, data: dict) -> Dict[str, Any]:
        return json_store.create_record("vendors", data)

    def update(self, vendor_id: str, updates: dict) -> Dict[str, Any]:
        return json_store.update_record("vendors", vendor_id, updates)

    def delete(self, vendor_id: str) -> Dict[str, Any]:
        return json_store.delete_record("vendors", vendor_id)


class JSONManagerRepository(BaseManagerRepository):
    def list(self) -> List[Dict[str, Any]]:
        return json_store.read_all("managers")

    def find_by_id(self, manager_id: str) -> Optional[Dict[str, Any]]:
        return json_store.find_by_id("managers", manager_id)

    def update(self, manager_id: str, updates: dict) -> Dict[str, Any]:
        return json_store.update_record("managers", manager_id, updates)


class JSONOwnerRepository(BaseOwnerRepository):
    def list(self) -> List[Dict[str, Any]]:
        return json_store.read_all("owners")

    def find_by_id(self, owner_id: str) -> Optional[Dict[str, Any]]:
        return json_store.find_by_id("owners", owner_id)

    def update(self, owner_id: str, updates: dict) -> Dict[str, Any]:
        return json_store.update_record("owners", owner_id, updates)


class JSONRequestRepository(BaseRequestRepository):
    def _normalize_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        # Normalize conversation messages
        if "conversation_history" in request:
            for msg in request["conversation_history"]:
                if "message" in msg:
                    msg["message"] = msg["message"].replace("\r\n", "\n").replace("\r", "\n").strip()
        return request

    def list(self) -> List[Dict[str, Any]]:
        requests = json_store.read_all("requests")
        return [self._normalize_request(r) for r in requests]

    def find_by_id(self, request_id: str) -> Optional[Dict[str, Any]]:
        request = json_store.find_by_id("requests", request_id)
        if request:
            return self._normalize_request(request)
        return None

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        requests = json_store.find_by_field("requests", field, value)
        return [self._normalize_request(r) for r in requests]

    def create(self, data: dict) -> Dict[str, Any]:
        return json_store.create_record("requests", data)

    def update(self, request_id: str, updates: dict) -> Dict[str, Any]:
        return json_store.update_record("requests", request_id, updates)
