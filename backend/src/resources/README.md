# Resources folder

Static data and PostgreSQL database definitions for the Ranting Chant property management system.

- **SQL migrations** - canonical PostgreSQL schema, RLS policies, seed data, and production hardening (primary database)
- **Mock JSON files** - flat-file runtime/reference data used as fallback for local development

## Directory structure

```text
resources/
|-- README.md
|-- db/
|   `-- migrations/
|       |-- 001_initial_schema.sql    # Canonical actor-based schema and auth mapping
|       |-- 002_rls_policies.sql      # Row Level Security policies and auth helpers
|       |-- 003_seed_data.sql         # Normalized UUID seed data
|       `-- 004_schema_hardening.sql  # Indexes, audit tables, attachments, account indexes
`-- mock_db_jsons/
    |-- owners.json
    |-- property_magament.json
    |-- properties.json
    |-- tenants.json
    |-- vendors.json
    `-- requests.json
```

## Migration order

Apply migrations in numeric order:

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_seed_data.sql`
4. `004_schema_hardening.sql`

`001_initial_schema.sql` is the canonical schema. Later migrations must not recreate base tables or reintroduce deprecated columns.

## Current schema model

The production schema uses a unified identity layer:

```text
actors
|-- owners
|-- property_managers
|-- tenants
`-- vendors
```

All people and organizations that can participate in a request are stored in `actors`.
Only owners and managers get Supabase login accounts in `user_accounts`; tenants are
manager/owner-provisioned contact and tenancy records, not self-signup users.
Role-specific tables use the same UUID as the actor:

| Role table | Key |
|---|---|
| `owners.id` | FK to `actors.id` |
| `property_managers.id` | FK to `actors.id` |
| `tenants.id` | FK to `actors.id` |
| `vendors.id` | FK to `actors.id` |

Supabase auth maps to actor identity through `user_accounts`:

```text
auth.uid() = user_accounts.auth_user_id
user_accounts.actor_id = actors.id
```

Passwords are stored by Supabase Auth in `auth.users`, not in the application schema.
Username login is supported by storing a unique `user_accounts.username` and resolving it
to the account email before calling Supabase password sign-in.

## Enum types

| Enum | Values |
|---|---|
| `recipient_type` | `tenant`, `owner`, `manager`, `vendor` |
| `request_status` | `pending`, `in_progress`, `pending_approval`, `escalated`, `resolved`, `cancelled` |
| `request_urgency` | `low`, `medium`, `high`, `critical` |
| `request_type` | `plumbing`, `electrical`, `hvac`, `appliance`, `pest_control`, `lockout`, `access_control`, `noise`, `lease_question`, `rent_payment`, `emergency`, `general` |
| `property_type` | `apartment_building`, `loft_building`, `modern_apartment_complex`, `single_family_home`, `townhouse`, `condominium` |
| `notification_type` | `email`, `sms` |
| `notification_status` | `pending`, `sent`, `failed` |
| `message_role` | `ai`, `tenant` |

There is no `representative_type` enum in the canonical schema.

## Core tables

### `actors`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `type` | `recipient_type` | Actor role |
| `display_name` | VARCHAR(255) | Required |
| `email` | CITEXT | Optional, case-insensitive |
| `phone` | VARCHAR(50) | Optional |
| `is_active` | BOOLEAN | Default `TRUE` |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

### Role tables

| Table | Purpose |
|---|---|
| `owners` | Owner role row for an actor |
| `property_managers` | Property manager role row for an actor |
| `tenants` | Tenant role row for an actor; references `units.id` |
| `vendors` | Vendor role row for an actor; includes `emergency_available` |

Names, emails, and phones live in `actors`, not role tables.

### `user_accounts`

| Column | Type | Notes |
|---|---|---|
| `auth_user_id` | UUID | PK and FK to `auth.users(id)` |
| `actor_id` | UUID | Unique FK to `actors(id)` |
| `email` | CITEXT | Unique, required, case-insensitive |
| `username` | CITEXT | Unique, optional, case-insensitive |
| `role` | `recipient_type` | Required; only `owner` or `manager` |
| `provider` | VARCHAR(50) | Default `email` |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

`user_accounts` is the only table that marks an actor as login-capable. A trigger
ensures the mapped actor exists and has a matching `owner` or `manager` role. Tenant
actors do not receive rows in this table under the current product model.

### `properties`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Required |
| `address` | TEXT | Required |
| `year_built` | INTEGER | Optional |
| `property_type` | `property_type` | Required |
| `unit_count` | INTEGER | Required, non-negative |
| `created_by` | UUID | FK to `actors(id)`, used to attach the creator's first owner/manager relationship |
| `is_active` | BOOLEAN | Default `TRUE` |
| `deleted_at` | TIMESTAMPTZ | Optional |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

Properties do not contain `owner_id`, `manager_id`, `representative_type`, or `representative_id`.

Ownership and management are represented only by:

| Table | Meaning |
|---|---|
| `owner_properties(owner_id, property_id)` | Owners related to properties |
| `manager_properties(manager_id, property_id)` | Managers related to properties |

When an owner or manager creates a property through RLS-protected database access,
the insert must set `properties.created_by` to the current actor ID. That creator can
then insert their first `owner_properties` or `manager_properties` row for the property.

### `units`

`units` exists in `001_initial_schema.sql`.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `property_id` | UUID | FK to `properties(id)` |
| `unit_number` | VARCHAR(50) | Required |
| `bedrooms` | INTEGER | Optional |
| `bathrooms` | NUMERIC(3,1) | Optional |
| `square_feet` | INTEGER | Optional |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

Unique constraint: `(property_id, unit_number)`.

### `tenants`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK and FK to `actors(id)` |
| `unit_id` | UUID | FK to `units(id)` |
| `is_active` | BOOLEAN | Default `TRUE` |
| `deleted_at` | TIMESTAMPTZ | Optional |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

Tenants do not contain `property_id` or a string `unit` field.
Tenant property access is always derived through:

```text
tenants.unit_id -> units.id -> units.property_id -> properties.id
```

### `requests`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `requester_id` | UUID | FK to `tenants(id)` |
| `property_id` | UUID | FK to `properties(id)`, nullable |
| `vendor_id` | UUID | Current assigned vendor, FK to `vendors(id)`, nullable |
| `type` | `request_type` | Required |
| `description` | TEXT | Optional |
| `status` | `request_status` | Default `pending` |
| `urgency` | `request_urgency` | Default `medium` |
| `escalated` | BOOLEAN | Default `false` |
| `sentiment` | VARCHAR(50) | Optional |
| `confidence` | DECIMAL(3,2) | Optional |
| `notification_pending` | BOOLEAN | Default `false` |
| `summary` | TEXT | Optional |
| `resolved_at` | TIMESTAMPTZ | Optional resolution timestamp |
| `resolved_by` | UUID | FK to `actors(id)`, nullable |
| `resolution_note` | TEXT | Optional manager/owner resolution note |
| `is_active` | BOOLEAN | Default `TRUE` |
| `deleted_at` | TIMESTAMPTZ | Optional |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

`requests.vendor_id` stores the current assignment. Full assignment history is stored in `request_assignments`.

### Request participants

`request_involved_parties` uses the clean actor model:

| Column | Type | Notes |
|---|---|---|
| `request_id` | UUID | FK to `requests(id)` |
| `actor_id` | UUID | FK to `actors(id)` |

Primary key: `(request_id, actor_id)`.

There is no `party_type` or `party_id`.

### Messages and notifications

`conversation_messages`:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `request_id` | UUID | FK to `requests(id)` |
| `role` | `message_role` | `ai` or `tenant` |
| `message` | TEXT | Required |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

`notifications`:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `request_id` | UUID | FK to `requests(id)` |
| `type` | `notification_type` | `email` or `sms` |
| `recipient_actor_id` | UUID | FK to `actors(id)`, nullable |
| `recipient_type` | `recipient_type` | Required |
| `status` | `notification_status` | Default `pending` |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

## Hardening migration

`004_schema_hardening.sql` only adds production hardening that is not already present in `001_initial_schema.sql`:

- Performance indexes
- `request_attachments`
- `request_status_history`
- `request_assignments`
- Additional `user_accounts` indexes and RLS refresh
- RLS policies for the hardening tables
- Backfills for initial request status history and current vendor assignments

It does not recreate `units`, does not backfill tenants from legacy `property_id`/`unit` columns, and does not alter ownership fields on `properties`.

### `request_attachments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `request_id` | UUID | FK to `requests(id)` |
| `uploaded_by` | UUID | FK to `actors(id)`, nullable |
| `file_url` | TEXT | Required |
| `file_type` | VARCHAR(100) | Optional |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

### `request_status_history`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `request_id` | UUID | FK to `requests(id)` |
| `old_status` | `request_status` | Optional |
| `new_status` | `request_status` | Required |
| `changed_by` | UUID | FK to `actors(id)`, nullable |
| `notes` | TEXT | Optional |
| `changed_at` | TIMESTAMPTZ | Default `NOW()` |

### `request_assignments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `request_id` | UUID | FK to `requests(id)` |
| `vendor_id` | UUID | FK to `vendors(id)`, nullable |
| `assigned_by` | UUID | FK to `actors(id)`, nullable |
| `status` | VARCHAR(50) | Optional |
| `assigned_at` | TIMESTAMPTZ | Default `NOW()` |
| `completed_at` | TIMESTAMPTZ | Optional |

## Row Level Security

`002_rls_policies.sql` enables base RLS and defines actor-centric helper functions:

| Helper | Purpose |
|---|---|
| `current_actor_id()` | Resolves `auth.uid()` to the owner/manager actor ID in `user_accounts` |
| `current_actor_is_manager_or_owner()` | Checks whether the logged-in actor can manage operational data |
| `actor_can_access_request(request_id, actor_id)` | Request access through requester, vendor assignment, involved parties, owner relationships, or manager relationships |
| `actor_can_access_property(property_id, actor_id)` | Property access through ownership, management, tenancy, or accessible requests |
| `actor_can_manage_property(property_id, actor_id)` | Property management through owner/manager junction tables |
| `actor_can_access_actor(visible_actor_id, actor_id)` | Actor visibility through self, property relationships, or shared request access |

RLS rules follow these principles:

- `auth.uid()` maps to `user_accounts.auth_user_id`, then to `actors.id`.
- Only owners and managers have `user_accounts` rows.
- Tenants are created and managed by owners/managers; tenant self-signup is not represented in RLS.
- Tenant property access always goes through `tenants -> units -> properties`.
- Owners access properties and requests through `owner_properties`.
- Managers access properties and requests through `manager_properties`.
- Tenant-facing request creation should go through the backend/conversation service or another trusted server path.

`004_schema_hardening.sql` adds RLS for its new tables and reuses the helper functions from `002_rls_policies.sql`.

## Seed data

`003_seed_data.sql` normalizes mock data into the production schema:

| Mock source | SQL target |
|---|---|
| owners | `actors`, `owners` |
| property managers | `actors`, `property_managers` |
| tenants | `actors`, `units`, `tenants` |
| vendors | `actors`, `vendors`, `vendor_services` |
| properties | `properties`, `owner_properties`, `manager_properties` |
| requests | `requests`, `request_involved_parties`, `conversation_messages` |

The seed migration uses UUIDs only and preserves mock data semantics while matching the normalized schema.

## Mock JSON data

The JSON files remain a runtime/mock format and are not the production schema.

| File | Records |
|---|---|
| `owners.json` | 5 |
| `property_magament.json` | 4 |
| `properties.json` | 5 |
| `tenants.json` | 11 |
| `vendors.json` | 10 |
| `requests.json` | 13 |

Important differences:

- JSON tenant records still include string `property_id` and `unit`; SQL maps those to `units` plus `tenants.unit_id`.
- JSON property records may include representative metadata; SQL does not store representative columns on `properties`.
- JSON request records may contain denormalized fields like `property`, `notifications_sent`, and `conversation_history`; SQL stores normalized request, notification, and message rows.
- JSON uses string IDs like `tenant_001`; SQL seed data uses UUIDs only.

## Entity relationships

```text
actors
|-- owners -------- owner_properties -------- properties -------- units -------- tenants
|-- property_managers -- manager_properties -----|
|-- vendors -------- vendor_services
`-- tenants

auth.users
`-- user_accounts -------- actors

requests
|-- requester_id -> tenants.id -> actors.id
|-- property_id -> properties.id
|-- vendor_id -> vendors.id -> actors.id
|-- request_involved_parties(request_id, actor_id)
|-- conversation_messages
|-- notifications
|-- request_attachments
|-- request_status_history
`-- request_assignments

user_accounts.auth_user_id -> auth.users.id
user_accounts.actor_id -> actors.id
```

## Data retention

Soft-delete fields are part of the base schema for:

- `actors`
- `properties`
- `tenants`
- `requests`

Operational child records remain dependent on requests and use `ON DELETE CASCADE`.

Key FK behavior:

| Relationship | ON DELETE |
|---|---|
| role tables -> `actors` | CASCADE |
| `owner_properties` / `manager_properties` | CASCADE |
| `units.property_id` -> `properties` | CASCADE |
| `tenants.unit_id` -> `units` | RESTRICT |
| `requests.requester_id` -> `tenants` | RESTRICT |
| `requests.property_id` -> `properties` | SET NULL |
| `requests.vendor_id` -> `vendors` | SET NULL |
| `requests.resolved_by` -> `actors` | SET NULL |
| request child tables -> `requests` | CASCADE |
| actor references in hardening tables | SET NULL |
| `user_accounts.auth_user_id` -> `auth.users` | CASCADE |
| `user_accounts.actor_id` -> `actors` | CASCADE |
```
