"""
base.py

Abstract base classes for the Ranting Chant repository layer.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseTenantRepository(ABC):
    @abstractmethod
    def list(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_id(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def create(self, data: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def update(self, tenant_id: str, updates: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete(self, tenant_id: str) -> Dict[str, Any]:
        pass


class BasePropertyRepository(ABC):
    @abstractmethod
    def list(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_id(self, property_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def create(self, data: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def update(self, property_id: str, updates: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete(self, property_id: str) -> Dict[str, Any]:
        pass


class BaseVendorRepository(ABC):
    @abstractmethod
    def list(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_id(self, vendor_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def create(self, data: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def update(self, vendor_id: str, updates: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete(self, vendor_id: str) -> Dict[str, Any]:
        pass


class BaseManagerRepository(ABC):
    @abstractmethod
    def list(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_id(self, manager_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def update(self, manager_id: str, updates: dict) -> Dict[str, Any]:
        pass


class BaseOwnerRepository(ABC):
    @abstractmethod
    def list(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_id(self, owner_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def update(self, owner_id: str, updates: dict) -> Dict[str, Any]:
        pass


class BaseRequestRepository(ABC):
    @abstractmethod
    def list(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_id(self, request_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def create(self, data: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def update(self, request_id: str, updates: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def record_status_history(
        self,
        request_id: str,
        old_status: str,
        new_status: str,
        changed_by: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> None:
        """Record a status transition in the request_status_history table (no-op for JSON)."""

    @abstractmethod
    def record_vendor_assignment(
        self,
        request_id: str,
        vendor_id: Optional[str],
        assigned_by: Optional[str] = None,
    ) -> None:
        """Record a vendor assignment in the request_assignments table (no-op for JSON)."""


class BaseConversationMessageRepository(ABC):
    @abstractmethod
    def list_by_request(self, request_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def create(self, data: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete_by_request(self, request_id: str) -> None:
        pass


class BaseNotificationRepository(ABC):
    @abstractmethod
    def list_by_request(self, request_id: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def create(self, data: dict) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete_by_request(self, request_id: str) -> None:
        pass
