"""
supabase_repo.py

Supabase/PostgreSQL-backed concrete implementations of the repository interfaces.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
import uuid

from src.database.repositories.base import (
    BaseTenantRepository,
    BasePropertyRepository,
    BaseVendorRepository,
    BaseManagerRepository,
    BaseOwnerRepository,
    BaseRequestRepository,
    BaseConversationMessageRepository,
    BaseNotificationRepository,
)


class SupabaseTenantRepository(BaseTenantRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _map_row(self, row: dict) -> dict:
        unit_info = row.get("units") or {}
        prop_info = unit_info.get("properties") or {}
        actor_info = row.get("actors") or {}
        return {
            "id": row.get("id"),
            "name": actor_info.get("display_name") or "",
            "email": actor_info.get("email") or "",
            "phone": actor_info.get("phone") or "",
            "address": prop_info.get("address") or "",
            "unit": unit_info.get("unit_number") or "",
            "property_id": unit_info.get("property_id") or ""
        }

    def list(self) -> List[Dict[str, Any]]:
        res = self.supabase.table("tenants").select(
            "id, is_active, units(id, unit_number, property_id, properties(name, address)), actors(display_name, email, phone)"
        ).eq("is_active", True).execute()
        return [self._map_row(row) for row in res.data]

    def find_by_id(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        res = self.supabase.table("tenants").select(
            "id, is_active, units(id, unit_number, property_id, properties(name, address)), actors(display_name, email, phone)"
        ).eq("id", tenant_id).execute()
        if not res.data:
            return None
        return self._map_row(res.data[0])

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        if field == "property_id":
            # Filter tenants by property_id of their unit
            res = self.supabase.table("tenants").select(
                "id, is_active, units(id, unit_number, property_id, properties(name, address)), actors(display_name, email, phone)"
            ).eq("units.property_id", value).eq("is_active", True).execute()
            # Post-filter rows since Supabase returns parent records even if nested filters fail
            data = []
            for row in res.data:
                mapped = self._map_row(row)
                if mapped["property_id"] == value:
                    data.append(mapped)
            return data
        else:
            # Fallback to list filtering
            all_tenants = self.list()
            return [t for t in all_tenants if t.get(field) == value]

    def create(self, data: dict) -> Dict[str, Any]:
        property_id = data.get("property_id")
        unit_number = data.get("unit")
        
        # 1. Resolve unit_id (find or create)
        unit_res = self.supabase.table("units").select("id").eq("property_id", property_id).eq("unit_number", unit_number).execute()
        if unit_res.data:
            unit_id = unit_res.data[0]["id"]
        else:
            insert_res = self.supabase.table("units").insert({
                "property_id": property_id,
                "unit_number": unit_number
            }).execute()
            unit_id = insert_res.data[0]["id"]

        # 2. Insert into actors
        actor_data = {
            "type": "tenant",
            "display_name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone")
        }
        if "id" in data:
            actor_data["id"] = data["id"]
        actor_res = self.supabase.table("actors").insert(actor_data).execute()
        actor_id = actor_res.data[0]["id"]

        # 3. Insert into tenants
        self.supabase.table("tenants").insert({
            "id": actor_id,
            "unit_id": unit_id,
            "is_active": True
        }).execute()

        return self.find_by_id(actor_id)

    def update(self, tenant_id: str, updates: dict) -> Dict[str, Any]:
        # Update actor table fields if provided
        actor_updates = {}
        if "name" in updates:
            actor_updates["display_name"] = updates["name"]
        if "email" in updates:
            actor_updates["email"] = updates["email"]
        if "phone" in updates:
            actor_updates["phone"] = updates["phone"]
        
        if actor_updates:
            self.supabase.table("actors").update(actor_updates).eq("id", tenant_id).execute()

        # Update unit relationship if unit or property_id changes
        if "unit" in updates or "property_id" in updates:
            tenant_info = self.find_by_id(tenant_id)
            if tenant_info:
                new_property_id = updates.get("property_id", tenant_info["property_id"])
                new_unit = updates.get("unit", tenant_info["unit"])
                
                # Resolve unit_id
                unit_res = self.supabase.table("units").select("id").eq("property_id", new_property_id).eq("unit_number", new_unit).execute()
                if unit_res.data:
                    unit_id = unit_res.data[0]["id"]
                else:
                    insert_res = self.supabase.table("units").insert({
                        "property_id": new_property_id,
                        "unit_number": new_unit
                    }).execute()
                    unit_id = insert_res.data[0]["id"]
                
                self.supabase.table("tenants").update({"unit_id": unit_id}).eq("id", tenant_id).execute()

        return self.find_by_id(tenant_id)

    def delete(self, tenant_id: str) -> Dict[str, Any]:
        tenant_info = self.find_by_id(tenant_id)
        # Soft delete: set is_active=False and deleted_at timestamp on both
        # tenants and actors rows so the record is preserved but hidden.
        now = datetime.now(timezone.utc).isoformat()
        self.supabase.table("tenants").update({
            "is_active": False,
            "deleted_at": now
        }).eq("id", tenant_id).execute()
        self.supabase.table("actors").update({
            "is_active": False,
            "updated_at": now
        }).eq("id", tenant_id).execute()
        return tenant_info


class SupabasePropertyRepository(BasePropertyRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _map_row(self, row: dict) -> dict:
        owner_ids = [o["owner_id"] for o in row.get("owner_properties", [])]
        manager_ids = [m["manager_id"] for m in row.get("manager_properties", [])]
        
        owner_id = owner_ids[0] if owner_ids else None
        manager_id = manager_ids[0] if manager_ids else None
        
        # Aggregate tenant IDs
        tenant_ids = []
        for unit in row.get("units", []):
            for tenant in unit.get("tenants", []):
                tenant_ids.append(tenant["id"])
                
        # Determine representative
        representative = None
        if manager_id:
            representative = {"type": "property_manager", "id": manager_id}
        elif owner_id:
            representative = {"type": "owner", "id": owner_id}

        return {
            "id": row.get("id"),
            "name": row.get("name"),
            "address": row.get("address"),
            "year_built": row.get("year_built"),
            "property_type": row.get("property_type"),
            "unit_count": row.get("unit_count"),
            "owner_id": owner_id,
            "manager_id": manager_id,
            "tenant_ids": tenant_ids,
            "representative": representative
        }

    def list(self) -> List[Dict[str, Any]]:
        res = self.supabase.table("properties").select(
            "*, owner_properties(owner_id), manager_properties(manager_id), units(id, tenants(id))"
        ).eq("is_active", True).execute()
        return [self._map_row(row) for row in res.data]

    def find_by_id(self, property_id: str) -> Optional[Dict[str, Any]]:
        res = self.supabase.table("properties").select(
            "*, owner_properties(owner_id), manager_properties(manager_id), units(id, tenants(id))"
        ).eq("id", property_id).execute()
        if not res.data:
            return None
        return self._map_row(res.data[0])

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        all_properties = self.list()
        return [p for p in all_properties if p.get(field) == value]

    def create(self, data: dict) -> Dict[str, Any]:
        prop_data = {
            "name": data.get("name"),
            "address": data.get("address"),
            "year_built": data.get("year_built"),
            "property_type": data.get("property_type"),
            "unit_count": data.get("unit_count", 0),
            "is_active": True
        }
        if "id" in data:
            prop_data["id"] = data["id"]
            
        res = self.supabase.table("properties").insert(prop_data).execute()
        prop_id = res.data[0]["id"]

        # Insert owner property relationship if provided
        if data.get("owner_id"):
            self.supabase.table("owner_properties").insert({
                "owner_id": data["owner_id"],
                "property_id": prop_id
            }).execute()

        # Insert manager property relationship if provided
        if data.get("manager_id"):
            self.supabase.table("manager_properties").insert({
                "manager_id": data["manager_id"],
                "property_id": prop_id
            }).execute()

        return self.find_by_id(prop_id)

    def update(self, property_id: str, updates: dict) -> Dict[str, Any]:
        prop_updates = {}
        for k in ["name", "address", "year_built", "property_type", "unit_count", "is_active"]:
            if k in updates:
                prop_updates[k] = updates[k]
                
        if prop_updates:
            self.supabase.table("properties").update(prop_updates).eq("id", property_id).execute()

        # Update owner_id relationship if provided
        if "owner_id" in updates:
            self.supabase.table("owner_properties").delete().eq("property_id", property_id).execute()
            if updates["owner_id"]:
                self.supabase.table("owner_properties").insert({
                    "owner_id": updates["owner_id"],
                    "property_id": property_id
                }).execute()

        # Update manager_id relationship if provided
        if "manager_id" in updates:
            self.supabase.table("manager_properties").delete().eq("property_id", property_id).execute()
            if updates["manager_id"]:
                self.supabase.table("manager_properties").insert({
                    "manager_id": updates["manager_id"],
                    "property_id": property_id
                }).execute()

        return self.find_by_id(property_id)

    def delete(self, property_id: str) -> Dict[str, Any]:
        prop_info = self.find_by_id(property_id)
        self.supabase.table("properties").update({"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}).eq("id", property_id).execute()
        return prop_info


class SupabaseVendorRepository(BaseVendorRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _map_row(self, row: dict) -> dict:
        actor_info = row.get("actors") or {}
        services = [s["service_name"] for s in row.get("vendor_services", [])]
        return {
            "id": row.get("id"),
            "name": actor_info.get("display_name") or "",
            "email": actor_info.get("email") or "",
            "phone": actor_info.get("phone") or "",
            "services": services,
            "emergency_available": row.get("emergency_available", False)
        }

    def list(self) -> List[Dict[str, Any]]:
        res = self.supabase.table("vendors").select(
            "id, emergency_available, actors(display_name, email, phone), vendor_services(service_name)"
        ).execute()
        return [self._map_row(row) for row in res.data]

    def find_by_id(self, vendor_id: str) -> Optional[Dict[str, Any]]:
        res = self.supabase.table("vendors").select(
            "id, emergency_available, actors(display_name, email, phone), vendor_services(service_name)"
        ).eq("id", vendor_id).execute()
        if not res.data:
            return None
        return self._map_row(res.data[0])

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        all_vendors = self.list()
        return [v for v in all_vendors if v.get(field) == value]

    def create(self, data: dict) -> Dict[str, Any]:
        # 1. Insert into actors
        actor_data = {
            "type": "vendor",
            "display_name": data.get("name"),
            "email": data.get("email"),
            "phone": data.get("phone")
        }
        if "id" in data:
            actor_data["id"] = data["id"]
        actor_res = self.supabase.table("actors").insert(actor_data).execute()
        actor_id = actor_res.data[0]["id"]

        # 2. Insert into vendors
        self.supabase.table("vendors").insert({
            "id": actor_id,
            "emergency_available": data.get("emergency_available", False)
        }).execute()

        # 3. Insert services
        services = data.get("services", [])
        if services:
            services_data = [{"vendor_id": actor_id, "service_name": s} for s in services]
            self.supabase.table("vendor_services").insert(services_data).execute()

        return self.find_by_id(actor_id)

    def update(self, vendor_id: str, updates: dict) -> Dict[str, Any]:
        # Update actor fields
        actor_updates = {}
        if "name" in updates:
            actor_updates["display_name"] = updates["name"]
        if "email" in updates:
            actor_updates["email"] = updates["email"]
        if "phone" in updates:
            actor_updates["phone"] = updates["phone"]
        if actor_updates:
            self.supabase.table("actors").update(actor_updates).eq("id", vendor_id).execute()

        # Update emergency_available
        if "emergency_available" in updates:
            self.supabase.table("vendors").update({"emergency_available": updates["emergency_available"]}).eq("id", vendor_id).execute()

        # Update services
        if "services" in updates:
            self.supabase.table("vendor_services").delete().eq("vendor_id", vendor_id).execute()
            services_data = [{"vendor_id": vendor_id, "service_name": s} for s in updates["services"]]
            if services_data:
                self.supabase.table("vendor_services").insert(services_data).execute()

        return self.find_by_id(vendor_id)

    def delete(self, vendor_id: str) -> Dict[str, Any]:
        vendor_info = self.find_by_id(vendor_id)
        # Cascade delete is handled by database when we delete the actor
        self.supabase.table("actors").delete().eq("id", vendor_id).execute()
        return vendor_info


class SupabaseManagerRepository(BaseManagerRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _map_row(self, row: dict) -> dict:
        actor_info = row.get("actors") or {}
        managed = [p["property_id"] for p in row.get("manager_properties", [])]
        return {
            "id": row.get("id"),
            "name": actor_info.get("display_name") or "",
            "email": actor_info.get("email") or "",
            "phone": actor_info.get("phone") or "",
            "managed_properties": managed
        }

    def list(self) -> List[Dict[str, Any]]:
        res = self.supabase.table("property_managers").select(
            "id, actors(display_name, email, phone), manager_properties(property_id)"
        ).execute()
        return [self._map_row(row) for row in res.data]

    def find_by_id(self, manager_id: str) -> Optional[Dict[str, Any]]:
        res = self.supabase.table("property_managers").select(
            "id, actors(display_name, email, phone), manager_properties(property_id)"
        ).eq("id", manager_id).execute()
        if not res.data:
            return None
        return self._map_row(res.data[0])

    def update(self, manager_id: str, updates: dict) -> Dict[str, Any]:
        actor_updates = {}
        if "name" in updates:
            actor_updates["display_name"] = updates["name"]
        if "email" in updates:
            actor_updates["email"] = updates["email"]
        if "phone" in updates:
            actor_updates["phone"] = updates["phone"]
        if actor_updates:
            self.supabase.table("actors").update(actor_updates).eq("id", manager_id).execute()
        return self.find_by_id(manager_id)


class SupabaseOwnerRepository(BaseOwnerRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _map_row(self, row: dict) -> dict:
        actor_info = row.get("actors") or {}
        owned = [p["property_id"] for p in row.get("owner_properties", [])]
        return {
            "id": row.get("id"),
            "name": actor_info.get("display_name") or "",
            "email": actor_info.get("email") or "",
            "phone": actor_info.get("phone") or "",
            "owned_properties": owned
        }

    def list(self) -> List[Dict[str, Any]]:
        res = self.supabase.table("owners").select(
            "id, actors(display_name, email, phone), owner_properties(property_id)"
        ).execute()
        return [self._map_row(row) for row in res.data]

    def find_by_id(self, owner_id: str) -> Optional[Dict[str, Any]]:
        res = self.supabase.table("owners").select(
            "id, actors(display_name, email, phone), owner_properties(property_id)"
        ).eq("id", owner_id).execute()
        if not res.data:
            return None
        return self._map_row(res.data[0])

    def update(self, owner_id: str, updates: dict) -> Dict[str, Any]:
        actor_updates = {}
        if "name" in updates:
            actor_updates["display_name"] = updates["name"]
        if "email" in updates:
            actor_updates["email"] = updates["email"]
        if "phone" in updates:
            actor_updates["phone"] = updates["phone"]
        if actor_updates:
            self.supabase.table("actors").update(actor_updates).eq("id", owner_id).execute()
        return self.find_by_id(owner_id)


class SupabaseRequestRepository(BaseRequestRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def _map_row(self, row: dict) -> dict:
        prop_name = row.get("properties", {}).get("name") if row.get("properties") else None
        involved = [p["actor_id"] for p in row.get("request_involved_parties", [])]
        
        # Map conversation messages ordered by creation time
        msgs = []
        raw_msgs = row.get("conversation_messages", []) or []
        for m in sorted(raw_msgs, key=lambda x: x.get("created_at") or ""):
            # Normalize line endings to \n and trim whitespace
            message = m.get("message")
            if message:
                message = message.replace("\r\n", "\n").replace("\r", "\n").strip()
            msgs.append({
                "id": m.get("id"),
                "role": m.get("role"),
                "message": message,
                "timestamp": m.get("created_at")
            })

        # Map notifications ordered by creation time
        notifs = []
        raw_notifs = row.get("notifications", []) or []
        for n in sorted(raw_notifs, key=lambda x: x.get("created_at") or ""):
            recipient_str = ""
            recipient_actor = n.get("actors")
            if recipient_actor:
                if n.get("type") == "email":
                    recipient_str = recipient_actor.get("email") or recipient_actor.get("display_name") or ""
                else:
                    recipient_str = recipient_actor.get("phone") or recipient_actor.get("display_name") or ""
            notifs.append({
                "type": n.get("type"),
                "recipient": recipient_str,
                "status": n.get("status"),
                "timestamp": n.get("created_at")
            })

        return {
            "id": row.get("id"),
            "requester_id": row.get("requester_id"),
            "type": row.get("type"),
            "description": row.get("description"),
            "status": row.get("status"),
            "urgency": row.get("urgency"),
            "involved_parties": involved,
            "conversation_history": msgs,
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "escalated": row.get("escalated", False),
            "sentiment": row.get("sentiment", "neutral"),
            "confidence": float(row.get("confidence") or 0.0),
            "vendor_id": row.get("vendor_id"),
            "notifications_sent": notifs,
            "notification_pending": row.get("notification_pending", False),
            "property_id": row.get("property_id"),
            "property": prop_name,
            "summary": row.get("summary"),
            "resolved_at": row.get("resolved_at"),
            "resolved_by": row.get("resolved_by"),
            "resolution_note": row.get("resolution_note"),
        }

    def list(self) -> List[Dict[str, Any]]:
        res = self.supabase.table("requests").select(
            "*, properties(name), request_involved_parties(actor_id), conversation_messages(*), notifications(*, actors(email, phone, display_name))"
        ).eq("is_active", True).execute()
        return [self._map_row(row) for row in res.data]

    def find_by_id(self, request_id: str) -> Optional[Dict[str, Any]]:
        res = self.supabase.table("requests").select(
            "*, properties(name), request_involved_parties(actor_id), conversation_messages(*), notifications(*, actors(email, phone, display_name))"
        ).eq("id", request_id).execute()
        if not res.data:
            return None
        return self._map_row(res.data[0])

    def find_by_field(self, field: str, value: Any) -> List[Dict[str, Any]]:
        if field == "requester_id":
            res = self.supabase.table("requests").select(
                "*, properties(name), request_involved_parties(actor_id), conversation_messages(*), notifications(*, actors(email, phone, display_name))"
            ).eq("requester_id", value).eq("is_active", True).execute()
            return [self._map_row(row) for row in res.data]
        else:
            all_requests = self.list()
            return [r for r in all_requests if r.get(field) == value]

    def create(self, data: dict) -> Dict[str, Any]:
        # 1. Resolve property_id from requester tenant if not provided
        property_id = data.get("property_id")
        if not property_id:
            tenant_res = self.supabase.table("tenants").select("units(property_id)").eq("id", data["requester_id"]).execute()
            if tenant_res.data and tenant_res.data[0]["units"]:
                property_id = tenant_res.data[0]["units"]["property_id"]

        # 2. Insert into requests table
        request_data = {
            "requester_id": data.get("requester_id"),
            "type": data.get("type", "general"),
            "description": data.get("description", ""),
            "status": data.get("status", "pending"),
            "urgency": data.get("urgency", "low"),
            "escalated": data.get("escalated", False),
            "sentiment": data.get("sentiment", "neutral"),
            "confidence": data.get("confidence", 0.0),
            "vendor_id": data.get("vendor_id"),
            "property_id": property_id,
            "notification_pending": data.get("notification_pending", True),
            "summary": data.get("summary"),
            "resolved_at": data.get("resolved_at"),
            "resolved_by": data.get("resolved_by"),
            "resolution_note": data.get("resolution_note"),
            "is_active": True
        }
        if "id" in data:
            request_data["id"] = data["id"]

        res = self.supabase.table("requests").insert(request_data).execute()
        req_id = res.data[0]["id"]

        # 3. Insert involved parties
        involved_parties = data.get("involved_parties", [])
        if data.get("requester_id") and data.get("requester_id") not in involved_parties:
            involved_parties.append(data["requester_id"])

        if involved_parties:
            parties_data = [{"request_id": req_id, "actor_id": p_id} for p_id in involved_parties]
            self.supabase.table("request_involved_parties").insert(parties_data).execute()

        # 4. Insert conversation history messages
        conversation_history = data.get("conversation_history", [])
        if conversation_history:
            messages_data = []
            for msg in conversation_history:
                messages_data.append({
                    "request_id": req_id,
                    "role": msg.get("role", "tenant"),
                    "message": msg.get("message", ""),
                    "created_at": msg.get("timestamp") or datetime.now(timezone.utc).isoformat()
                })
            self.supabase.table("conversation_messages").insert(messages_data).execute()

        # 5. Insert notification events
        notifications_sent = data.get("notifications_sent", [])
        if notifications_sent:
            for notif in notifications_sent:
                recipient = notif.get("recipient")
                # Try resolving recipient to actor ID
                actor_id = None
                if "@" in recipient:
                    actor_res = self.supabase.table("actors").select("id").eq("email", recipient).execute()
                    if actor_res.data:
                        actor_id = actor_res.data[0]["id"]
                else:
                    actor_res = self.supabase.table("actors").select("id").eq("phone", recipient).execute()
                    if actor_res.data:
                        actor_id = actor_res.data[0]["id"]
                
                self.supabase.table("notifications").insert({
                    "request_id": req_id,
                    "type": notif.get("type", "email"),
                    "recipient_actor_id": actor_id,
                    "recipient_type": "manager" if notif.get("type") == "email" else "tenant",
                    "status": notif.get("status", "sent"),
                    "created_at": notif.get("timestamp") or datetime.now(timezone.utc).isoformat()
                }).execute()

        return self.find_by_id(req_id)

    def update(self, request_id: str, updates: dict) -> Dict[str, Any]:
        # Handle conversation_history append
        if "conversation_history" in updates:
            # Query existing messages from database to calculate slice
            existing_msgs_res = self.supabase.table("conversation_messages").select("id").eq("request_id", request_id).execute()
            db_msg_count = len(existing_msgs_res.data)
            new_msgs = updates["conversation_history"][db_msg_count:]
            if new_msgs:
                messages_data = []
                for msg in new_msgs:
                    messages_data.append({
                        "request_id": request_id,
                        "role": msg.get("role", "tenant"),
                        "message": msg.get("message", ""),
                        "created_at": msg.get("timestamp") or datetime.now(timezone.utc).isoformat()
                    })
                self.supabase.table("conversation_messages").insert(messages_data).execute()

        # Handle notifications_sent append
        if "notifications_sent" in updates:
            existing_notifs_res = self.supabase.table("notifications").select("id").eq("request_id", request_id).execute()
            db_notif_count = len(existing_notifs_res.data)
            new_notifs = updates["notifications_sent"][db_notif_count:]
            if new_notifs:
                for notif in new_notifs:
                    recipient = notif.get("recipient")
                    actor_id = None
                    if "@" in recipient:
                        actor_res = self.supabase.table("actors").select("id").eq("email", recipient).execute()
                        if actor_res.data:
                            actor_id = actor_res.data[0]["id"]
                    else:
                        actor_res = self.supabase.table("actors").select("id").eq("phone", recipient).execute()
                        if actor_res.data:
                            actor_id = actor_res.data[0]["id"]
                    
                    self.supabase.table("notifications").insert({
                        "request_id": request_id,
                        "type": notif.get("type", "email"),
                        "recipient_actor_id": actor_id,
                        "recipient_type": "manager" if notif.get("type") == "email" else "tenant",
                        "status": notif.get("status", "sent"),
                        "created_at": notif.get("timestamp") or datetime.now(timezone.utc).isoformat()
                    }).execute()

        # Handle involved_parties replacement
        if "involved_parties" in updates:
            self.supabase.table("request_involved_parties").delete().eq("request_id", request_id).execute()
            parties_data = [{"request_id": request_id, "actor_id": p_id} for p_id in updates["involved_parties"]]
            if parties_data:
                self.supabase.table("request_involved_parties").insert(parties_data).execute()

        # Update other request fields
        req_updates = {}
        for k in ["status", "urgency", "type", "description", "escalated", "sentiment", "confidence", "vendor_id", "notification_pending", "summary", "resolved_at", "resolved_by", "resolution_note", "is_active"]:
            if k in updates:
                req_updates[k] = updates[k]
                
        if req_updates:
            self.supabase.table("requests").update(req_updates).eq("id", request_id).execute()

        return self.find_by_id(request_id)

    def record_status_history(
        self,
        request_id: str,
        old_status: str,
        new_status: str,
        changed_by: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> None:
        """Insert a row into request_status_history to track a status transition."""
        data: Dict[str, Any] = {
            "request_id": request_id,
            "old_status": old_status,
            "new_status": new_status,
        }
        if changed_by:
            data["changed_by"] = changed_by
        if notes:
            data["notes"] = notes
        self.supabase.table("request_status_history").insert(data).execute()

    def record_vendor_assignment(
        self,
        request_id: str,
        vendor_id: Optional[str],
        assigned_by: Optional[str] = None,
    ) -> None:
        """Insert a row into request_assignments when a vendor is assigned."""
        if not vendor_id:
            return
        data: Dict[str, Any] = {
            "request_id": request_id,
            "vendor_id": vendor_id,
        }
        if assigned_by:
            data["assigned_by"] = assigned_by
        self.supabase.table("request_assignments").insert(data).execute()


class SupabaseConversationMessageRepository(BaseConversationMessageRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def list_by_request(self, request_id: str) -> List[Dict[str, Any]]:
        res = self.supabase.table("conversation_messages").select("*").eq("request_id", request_id).execute()
        return res.data

    def create(self, data: dict) -> Dict[str, Any]:
        res = self.supabase.table("conversation_messages").insert(data).execute()
        return res.data[0] if res.data else {}

    def delete_by_request(self, request_id: str) -> None:
        self.supabase.table("conversation_messages").delete().eq("request_id", request_id).execute()


class SupabaseNotificationRepository(BaseNotificationRepository):
    def __init__(self, supabase_client):
        self.supabase = supabase_client

    def list_by_request(self, request_id: str) -> List[Dict[str, Any]]:
        res = self.supabase.table("notifications").select("*, actors(email, phone, display_name)").eq("request_id", request_id).execute()
        return res.data

    def create(self, data: dict) -> Dict[str, Any]:
        res = self.supabase.table("notifications").insert(data).execute()
        return res.data[0] if res.data else {}

    def delete_by_request(self, request_id: str) -> None:
        self.supabase.table("notifications").delete().eq("request_id", request_id).execute()
