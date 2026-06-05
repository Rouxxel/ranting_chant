# Resources folder

Static data and database definitions for the Ranting Chant property management system.

- **SQL migrations** — PostgreSQL schema, RLS policies, seed data, and production hardening
- **Mock JSON files** — Flat-file reference data (string IDs, nested structures)

## Directory structure

```
resources/
├── README.md
├── db/
│   └── migrations/
│       ├── 001_initial_schema.sql    # Base tables, enums, indexes, triggers
│       ├── 002_rls_policies.sql      # Row Level Security policies
│       ├── 003_seed_data.sql         # Sample data from mock JSON
│       └── 004_schema_hardening.sql  # Soft delete, units, audit tables, FK hardening
└── mock_db_jsons/
    ├── owners.json
    ├── property_magament.json
    ├── properties.json
    ├── tenants.json
    ├── vendors.json
    └── requests.json
```

### Migration order

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_seed_data.sql`
4. `004_schema_hardening.sql` — backfills `units` from seeded tenants; apply after seed

---

## Database schema

Base schema: `001_initial_schema.sql`. Production changes: `004_schema_hardening.sql`.

### Enum types

| Enum | Values |
|------|--------|
| `request_status` | `pending`, `in_progress`, `pending_approval`, `escalated`, `resolved`, `cancelled` |
| `request_urgency` | `low`, `medium`, `high`, `critical` |
| `request_type` | `plumbing`, `electrical`, `hvac`, `appliance`, `pest_control`, `lockout`, `access_control`, `noise`, `lease_question`, `rent_payment`, `emergency`, `general` |
| `property_type` | `apartment_building`, `loft_building`, `modern_apartment_complex`, `single_family_home`, `townhouse`, `condominium` |
| `notification_type` | `email`, `sms` |
| `notification_status` | `pending`, `sent`, `failed` |
| `message_role` | `ai`, `tenant` |
| `representative_type` | `property_manager`, `owner` |

### Soft-delete columns

All major entities include:

| Column | Type | Default |
|--------|------|---------|
| `is_active` | BOOLEAN NOT NULL | `TRUE` |
| `deleted_at` | TIMESTAMPTZ | `NULL` |

Applies to: `owners`, `property_managers`, `properties`, `tenants`, `vendors`, `requests`.

Production workflows should **soft-delete** (`is_active = FALSE`, `deleted_at = NOW()`) instead of physical `DELETE`. Physical deletion of tenants with requests is blocked by `ON DELETE RESTRICT`.

### Core tables

#### `owners`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` |
| `name` | VARCHAR(255) | NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `phone` | VARCHAR(50) | |
| `is_active` | BOOLEAN | NOT NULL, default `TRUE` |
| `deleted_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

#### `property_managers`

Same soft-delete columns as `owners`.

#### `properties`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `name` | VARCHAR(255) | NOT NULL |
| `address` | TEXT | NOT NULL |
| `year_built` | INTEGER | |
| `property_type` | `property_type` | NOT NULL |
| `unit_count` | INTEGER | NOT NULL |
| `owner_id` | UUID | NOT NULL, FK → `owners(id)` **ON DELETE RESTRICT** |
| `manager_id` | UUID | FK → `property_managers(id)` ON DELETE SET NULL |
| `representative_type` | `representative_type` | NOT NULL |
| `representative_id` | UUID | NOT NULL (trigger-validated) |
| `is_active` | BOOLEAN | NOT NULL, default `TRUE` |
| `deleted_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

#### `units`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` |
| `property_id` | UUID | NOT NULL, FK → `properties(id)` ON DELETE CASCADE |
| `unit_number` | VARCHAR(50) | NOT NULL |
| `bedrooms` | INTEGER | |
| `bathrooms` | NUMERIC(3,1) | |
| `square_feet` | INTEGER | |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |
| | | UNIQUE (`property_id`, `unit_number`) |

#### `tenants`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `name` | VARCHAR(255) | NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `phone` | VARCHAR(50) | |
| `address` | TEXT | |
| `unit_id` | UUID | NOT NULL, FK → `units(id)` ON DELETE RESTRICT |
| `is_active` | BOOLEAN | NOT NULL, default `TRUE` |
| `deleted_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

Property is derived: `tenant → unit → property`.

#### `vendors`

Core columns plus `is_active`, `deleted_at` (same pattern as `owners`).

#### `requests`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `requester_id` | UUID | NOT NULL, FK → `tenants(id)` **ON DELETE RESTRICT** |
| `property_id` | UUID | FK → `properties(id)` ON DELETE SET NULL |
| `vendor_id` | UUID | FK → `vendors(id)` ON DELETE SET NULL — **current** vendor |
| `type` | `request_type` | NOT NULL |
| `description` | TEXT | |
| `status` | `request_status` | default `pending` |
| `urgency` | `request_urgency` | default `medium` |
| `escalated` | BOOLEAN | default `false` |
| `sentiment` | VARCHAR(50) | |
| `confidence` | DECIMAL(3,2) | |
| `notification_pending` | BOOLEAN | default `false` |
| `summary` | TEXT | |
| `is_active` | BOOLEAN | NOT NULL, default `TRUE` |
| `deleted_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

`requests.vendor_id` holds the **currently assigned** vendor. Full assignment history lives in `request_assignments`.

#### `conversation_messages`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `request_id` | UUID | NOT NULL, FK → `requests(id)` ON DELETE CASCADE |
| `role` | `message_role` | NOT NULL |
| `message` | TEXT | NOT NULL |
| `timestamp` | TIMESTAMPTZ | default `NOW()` |

#### `notifications`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `request_id` | UUID | NOT NULL, FK → `requests(id)` ON DELETE CASCADE |
| `type` | `notification_type` | NOT NULL |
| `recipient` | VARCHAR(255) | NOT NULL |
| `recipient_type` | VARCHAR(50) | |
| `status` | `notification_status` | default `pending` |
| `timestamp` | TIMESTAMPTZ | default `NOW()` |

#### `request_attachments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `request_id` | UUID | NOT NULL, FK → `requests(id)` ON DELETE CASCADE |
| `uploaded_by` | UUID | |
| `file_url` | TEXT | NOT NULL |
| `file_type` | VARCHAR(100) | |
| `created_at` | TIMESTAMPTZ | default `NOW()` |

#### `request_status_history`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `request_id` | UUID | NOT NULL, FK → `requests(id)` ON DELETE CASCADE |
| `old_status` | `request_status` | |
| `new_status` | `request_status` | NOT NULL |
| `changed_by` | UUID | |
| `notes` | TEXT | |
| `changed_at` | TIMESTAMPTZ | default `NOW()` |

Every status transition must insert a row here.

#### `request_assignments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY |
| `request_id` | UUID | NOT NULL, FK → `requests(id)` ON DELETE CASCADE |
| `vendor_id` | UUID | FK → `vendors(id)` ON DELETE SET NULL |
| `assigned_by` | UUID | |
| `status` | VARCHAR(50) | e.g. `assigned`, `completed` |
| `assigned_at` | TIMESTAMPTZ | default `NOW()` |
| `completed_at` | TIMESTAMPTZ | |

Tracks vendor reassignment history. Update `requests.vendor_id` on each new assignment.

#### `user_accounts`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PRIMARY KEY (from auth provider) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `role` | VARCHAR(50) | NOT NULL |
| `owner_id` | UUID | FK → `owners(id)` ON DELETE SET NULL |
| `manager_id` | UUID | FK → `property_managers(id)` ON DELETE SET NULL |
| `tenant_id` | UUID | FK → `tenants(id)` ON DELETE SET NULL |
| `vendor_id` | UUID | FK → `vendors(id)` ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | default `NOW()` |

Maps auth users to business entities. Exactly one entity FK should be set per role.

### Junction tables

| Table | PK | ON DELETE |
|-------|-----|-----------|
| `owner_properties` | (`owner_id`, `property_id`) | CASCADE |
| `manager_properties` | (`manager_id`, `property_id`) | CASCADE |
| `vendor_services` | (`vendor_id`, `service_name`) | CASCADE |
| `request_involved_parties` | (`request_id`, `party_id`, `party_type`) | CASCADE |

### Schema features

- UUID primary keys
- `updated_at` triggers on `owners`, `property_managers`, `properties`, `units`, `tenants`, `vendors`, `requests`
- Partial indexes on `is_active` for core entities
- `properties.representative_id` validated by trigger

### Row Level Security

`002_rls_policies.sql` enables base RLS. `004_schema_hardening.sql` adds policies for new tables and updates tenant/property policies for the `unit_id` model.

Policies use `auth.uid()` mapped via `user_accounts` or direct entity UUID.

---

## Data retention and deletion strategy

**Core entities** (`owners`, `property_managers`, `properties`, `tenants`, `vendors`, `requests`) are **soft-deleted**:

```sql
UPDATE tenants SET is_active = FALSE, deleted_at = NOW() WHERE id = $1;
```

**Operational child records** (messages, notifications, attachments, status history, assignments) remain fully dependent on requests and use `ON DELETE CASCADE`.

**FK rules preventing accidental data loss:**

| Relationship | ON DELETE |
|--------------|-----------|
| `properties.owner_id` → `owners` | RESTRICT |
| `requests.requester_id` → `tenants` | RESTRICT |
| `tenants.unit_id` → `units` | RESTRICT |
| `properties.manager_id` → `property_managers` | SET NULL |
| `requests.vendor_id` → `vendors` | SET NULL |
| Request child tables → `requests` | CASCADE |
| Junction tables | CASCADE |

---

## Mock JSON data

| File | Records |
|------|---------|
| `owners.json` | 5 |
| `property_magament.json` | 4 |
| `properties.json` | 5 |
| `tenants.json` | 10 |
| `vendors.json` | 10 |
| `requests.json` | 2 |

### `tenants.json`

JSON still uses `property_id` + `unit` (flat mock format). SQL normalizes to `units` + `tenants.unit_id`:

```json
{
  "id": "tenant_001",
  "name": "John Tenant",
  "email": "john@gmail.com",
  "phone": "+14155552673",
  "address": "Spandauer Damm 10-22, 14059 Berlin, Germany",
  "unit": "4B",
  "property_id": "property_001"
}
```

SQL mapping: `unit` + `property_id` → `units` row; tenant references `unit_id`.

### `requests.json`

Unchanged JSON shape. New SQL tables have no JSON equivalents yet:

| SQL table | JSON source |
|-----------|-------------|
| `units` | `tenants[].unit` + `tenants[].property_id` |
| `owner_properties` | `owners[].owned_properties` |
| `manager_properties` | `property_magament[].managed_properties` |
| `vendor_services` | `vendors[].services` |
| `request_involved_parties` | `requests[].involved_parties` |
| `conversation_messages` | `requests[].conversation_history` |
| `request_attachments` | *(no JSON — app uploads)* |
| `request_status_history` | *(app writes on status change)* |
| `request_assignments` | *(app writes on vendor assign/reassign)* |

**JSON-only fields:** `property` (denormalized name), `notifications_sent`, `conversation_history[].web_results`.

### JSON vs SQL identifiers

Mock JSON uses string IDs. `003_seed_data.sql` maps to UUIDs. `004` backfills `units` from seeded tenant rows. Match by email/name when comparing.

---

## Entity relationships

```
owners ──────────────┬── owner_properties ── properties ── units
                     │                                    │
property_managers ───┼── manager_properties ───────────────┤
                     │                                    │
                     └── (representative) ─────────────────┘
                                                          │
tenants ─────────────────────────────────── unit_id ──────┘
     │
requests ──┬── request_involved_parties
           ├── conversation_messages
           ├── notifications
           ├── request_attachments
           ├── request_status_history
           └── request_assignments

vendors ─── vendor_services
     │
     └── requests.vendor_id (current) + request_assignments (history)

user_accounts ──► owners | property_managers | tenants | vendors
```
