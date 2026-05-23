# Ranting Chant — Postman API Reference

**Base URL:** `http://localhost:8000`  
**Content-Type:** `application/json` (required on all POST / PATCH requests)  
**Rate limit:** 30 requests / minute per endpoint (429 returned when exceeded)

---

## Root

### Health Check
```
GET /
```
No parameters. No body.

**Expected response `200`:**
```json
{
  "message": "Backend running successfully, ready to use other endpoints"
}
```

---

## Tenants

### List all tenants
```
GET /tenants
```
No body.

| Query param | Type | Required | Description |
|---|---|---|---|
| `property_id` | string | No | Filter tenants by property. e.g. `property_001` |

**Examples:**
```
GET /tenants
GET /tenants?property_id=property_001
```

**Expected response `200`:** array of tenant objects
```json
[
  {
    "id": "tenant_001",
    "name": "John Tenant",
    "email": "john@example.com",
    "phone": "+1-555-1234",
    "address": "123 Main St Apt 4B",
    "property_id": "property_001"
  }
]
```

---

### Get tenant by ID
```
GET /tenants/{tenant_id}
```
No body. Replace `{tenant_id}` in the URL.

**Examples:**
```
GET /tenants/tenant_001
GET /tenants/tenant_002
```

**Valid IDs:** `tenant_001` through `tenant_010`

**Expected response `200`:** single tenant object  
**Expected response `404`:** `{ "detail": "Tenant 'tenant_999' not found" }`

---

## Properties

### List all properties
```
GET /properties
```
No parameters. No body.

**Expected response `200`:** array of property objects
```json
[
  {
    "id": "property_001",
    "name": "Sunset Apartments",
    "address": "123 Main St, Berlin, 10115, Germany",
    "year_built": 1998,
    "property_type": "apartment_building",
    "unit_count": 24,
    "owner_id": "owner_001",
    "manager_id": "manager_001",
    "tenant_ids": ["tenant_001", "tenant_002", "tenant_009"],
    "representative": { "type": "property_manager", "id": "manager_001" }
  }
]
```

---

### Get property by ID
```
GET /properties/{property_id}
```
No body. Replace `{property_id}` in the URL.

**Examples:**
```
GET /properties/property_001
GET /properties/property_003
```

**Valid IDs:** `property_001` through `property_005`

**Expected response `200`:** single property object  
**Expected response `404`:** `{ "detail": "Property 'property_999' not found" }`

---

## Vendors

### List all vendors
```
GET /vendors
```
No parameters. No body.

**Expected response `200`:** array of vendor objects
```json
[
  {
    "id": "vendor_001",
    "name": "QuickFix Locksmith",
    "email": "dispatch@quickfix.com",
    "phone": "+1-555-4444",
    "services": ["locksmith"],
    "emergency_available": true
  }
]
```

---

### Filter vendors by service
```
GET /vendors/by-service/{service}
```
No body. Replace `{service}` in the URL (case-insensitive).

**Examples:**
```
GET /vendors/by-service/locksmith
GET /vendors/by-service/plumbing
GET /vendors/by-service/electrical
GET /vendors/by-service/hvac
GET /vendors/by-service/pest_control
GET /vendors/by-service/appliance_repair
GET /vendors/by-service/drain_cleaning
GET /vendors/by-service/glass_repair
GET /vendors/by-service/access_control
GET /vendors/by-service/general_repair
```

**Expected response `200`:** array of matching vendor objects (empty array if none match)

---

### Get vendor by ID
```
GET /vendors/{vendor_id}
```
No body. Replace `{vendor_id}` in the URL.

**Examples:**
```
GET /vendors/vendor_001
GET /vendors/vendor_005
```

**Valid IDs:** `vendor_001` through `vendor_010`

**Expected response `200`:** single vendor object  
**Expected response `404`:** `{ "detail": "Vendor 'vendor_999' not found" }`

---

## Managers

### List all managers
```
GET /managers
```
No parameters. No body.

**Expected response `200`:** array of manager objects
```json
[
  {
    "id": "manager_001",
    "name": "John management",
    "email": "sarah@management.com",
    "phone": "+1-555-2222",
    "managed_properties": ["property_001"]
  }
]
```

---

### Get manager by ID
```
GET /managers/{manager_id}
```
No body. Replace `{manager_id}` in the URL.

**Examples:**
```
GET /managers/manager_001
GET /managers/manager_004
```

**Valid IDs:** `manager_001` through `manager_004`

**Expected response `200`:** single manager object  
**Expected response `404`:** `{ "detail": "Manager 'manager_999' not found" }`

---

## Requests

### List all requests
```
GET /requests
```
No body.

| Query param | Type | Required | Description |
|---|---|---|---|
| `tenant_id` | string | No | Filter by tenant (requester). e.g. `tenant_001` |

**Examples:**
```
GET /requests
GET /requests?tenant_id=tenant_001
GET /requests?tenant_id=tenant_003
```

**Expected response `200`:** array of request objects

---

### Get request by ID
```
GET /requests/{request_id}
```
No body. Replace `{request_id}` in the URL.

**Examples:**
```
GET /requests/request_001
GET /requests/request_003
```

**Valid IDs:** `request_001` through `request_011`

**Expected response `200`:** full request object including `conversation_history` and `notifications_sent`  
**Expected response `404`:** `{ "detail": "Request 'request_999' not found" }`

---

### Get notifications for a request
```
GET /requests/{request_id}/notifications
```
No body. Replace `{request_id}` in the URL.

**Examples:**
```
GET /requests/request_001/notifications
GET /requests/request_003/notifications
```

**Expected response `200`:** array of notification event objects (empty array if none sent yet)
```json
[
  {
    "type": "email",
    "recipient": "manager@example.com",
    "status": "sent",
    "timestamp": "2026-05-23T12:00:00Z"
  }
]
```

---

### Create a request (direct — bypasses conversation engine)
```
POST /requests
```

**Headers:**
```
Content-Type: application/json
```

**Body — required fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `requester_id` | string | **Yes** | Tenant ID. e.g. `tenant_001` |
| `description` | string | **Yes** | Description of the issue |
| `type` | string | No | Request category. Default: `general` |
| `urgency` | string | No | `low` / `medium` / `high`. Default: `low` |
| `involved_parties` | array | No | List of party IDs. Default: `[]` |
| `vendor_id` | string | No | Assigned vendor ID. Default: `null` |

**Example body — minimal:**
```json
{
  "requester_id": "tenant_001",
  "description": "The kitchen sink is leaking"
}
```

**Example body — full:**
```json
{
  "requester_id": "tenant_002",
  "type": "maintenance",
  "description": "Heating system stopped working completely",
  "urgency": "high",
  "involved_parties": ["tenant_002", "manager_001"],
  "vendor_id": "vendor_004"
}
```

**Expected response `200`:** newly created request object with auto-generated `id` and timestamps  
**Expected response `400`:** `{ "detail": "Field 'requester_id' is required and must not be empty" }`

---

### Update a request (partial)
```
PATCH /requests/{request_id}
```

**Headers:**
```
Content-Type: application/json
```

Replace `{request_id}` in the URL. All body fields are optional — only provided fields are updated.

| Field | Type | Description |
|---|---|---|
| `status` | string | `pending` / `in_progress` / `escalated` / `resolved` / `pending_approval` / `pending_review` |
| `urgency` | string | `low` / `medium` / `high` |
| `description` | string | Updated description text |
| `escalated` | boolean | `true` or `false` |
| `sentiment` | string | `neutral` / `calm` / `frustrated` / `angry` |
| `confidence` | float | `0.0` – `1.0` |
| `vendor_id` | string | Vendor ID to assign, e.g. `vendor_002` |

**Example — mark as resolved:**
```json
{
  "status": "resolved"
}
```

**Example — escalate with vendor:**
```json
{
  "status": "escalated",
  "escalated": true,
  "urgency": "high",
  "vendor_id": "vendor_003"
}
```

**Example — approve a pending request:**
```json
{
  "status": "approved"
}
```

**Expected response `200`:** fully updated request object  
**Expected response `400`:** `{ "detail": "Request body must not be empty" }`  
**Expected response `404`:** `{ "detail": "Request 'request_999' not found" }`

---

## MCP

### List all registered MCP tools
```
GET /mcp/tools
```
No parameters. No body.

**Expected response `200`:**
```json
{
  "count": 16,
  "tools": [
    { "name": "lookup_tenant", "description": "Look up a tenant record by ID" },
    { "name": "get_tenant_by_name_and_unit", "description": "Find a tenant by name and address unit (used for mock login)" },
    { "name": "get_tenant_property", "description": "Return the property record associated with a tenant" },
    { "name": "lookup_property", "description": "Look up a property record by ID" },
    { "name": "get_property_manager", "description": "Return the manager record for a property" },
    { "name": "get_property_owner", "description": "Return the owner record for a property" },
    { "name": "find_vendors_by_service", "description": "Return all vendors offering a given service category" },
    { "name": "get_emergency_vendors", "description": "Return emergency-available vendors for a service category" },
    { "name": "get_vendor", "description": "Look up a vendor record by ID" },
    { "name": "create_request", "description": "Create a new service/maintenance request record" },
    { "name": "update_request", "description": "Merge updates into an existing request record" },
    { "name": "get_request", "description": "Look up a request record by ID" },
    { "name": "list_requests_by_tenant", "description": "Return all requests submitted by a specific tenant" },
    { "name": "list_all_requests", "description": "Return all request records" },
    { "name": "escalate_request", "description": "Escalate a request and append the reason to its history" },
    { "name": "append_conversation_turn", "description": "Append a conversation message to a request's history" }
  ]
}
```

---

## Error Responses

| Status | When |
|---|---|
| `400` | Missing required field or invalid input |
| `404` | Record not found |
| `429` | Rate limit exceeded (30 req/min) |
| `500` | Unexpected server error |

**429 body:**
```json
{
  "detail": "Request rate limit exceeded. Please try again later."
}
```

**500 body:**
```json
{
  "error": "Internal server error"
}
```

---

## Seed Data Quick Reference

Use these IDs directly in Postman without needing to look them up.

### Tenants
| ID | Name | Property |
|---|---|---|
| `tenant_001` | John Tenant | property_001 |
| `tenant_002` | John Hackathon | property_001 |
| `tenant_003` | Michael Brown | property_002 |
| `tenant_004` | Sophia Williams | property_002 |
| `tenant_005` | Daniel Johnson | property_003 |
| `tenant_006` | Olivia Martinez | property_004 |
| `tenant_007` | James Wilson | property_004 |
| `tenant_008` | Isabella Anderson | property_004 |
| `tenant_009` | Ethan Thomas | property_001 |
| `tenant_010` | Ava Taylor | property_005 |

### Properties
| ID | Name |
|---|---|
| `property_001` | Sunset Apartments |
| `property_002` | Riverbend Residences |
| `property_003` | Maple Heights |
| `property_004` | Willow Creek Lofts |
| `property_005` | Poplar Gardens |

### Managers
| ID | Name |
|---|---|
| `manager_001` | John management |
| `manager_002` | David Reynolds |
| `manager_003` | Laura Mitchell |
| `manager_004` | Kevin Thompson |

### Vendors & Services
| ID | Name | Services |
|---|---|---|
| `vendor_001` | QuickFix Locksmith | locksmith |
| `vendor_002` | AquaFlow Plumbing | plumbing |
| `vendor_003` | VoltPro Electrical | electrical |
| `vendor_004` | ArcticAir HVAC | hvac |
| `vendor_005` | HandyHero Maintenance | handyman, general_repair |
| `vendor_006` | RapidGlass & Door | glass_repair, door_repair, locksmith |
| `vendor_007` | SafeNest Pest Control | pest_control |
| `vendor_008` | ClearFlow Drain | drain_cleaning, plumbing |
| `vendor_009` | BrightSpark Appliance | appliance_repair |
| `vendor_010` | SecureAccess Systems | access_control, security_systems, locksmith |

### Requests
| ID | Type | Status | Urgency |
|---|---|---|---|
| `request_001` | key_replacement | pending | low |
| `request_002` | plumbing_issue | in_progress | medium |
| `request_003` | emergency_electrical | escalated | high |
| `request_004` | hvac_repair | pending | medium |
| `request_005` | lease_extension | pending_approval | low |
| `request_006` | lockout_assistance | in_progress | high |
| `request_007` | appliance_repair | in_progress | low |
| `request_008` | pest_control | pending | medium |
| `request_009` | door_repair | in_progress | medium |
| `request_010` | noise_complaint | pending_review | low |
| `request_011` | security_concern | escalated | high |
