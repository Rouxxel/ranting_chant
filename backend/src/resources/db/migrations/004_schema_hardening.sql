-- Schema Hardening for Ranting Chant
-- Run after 001_initial_schema.sql, 002_rls_policies.sql, and 003_seed_data.sql

BEGIN;

-- ============================================================================
-- 1. SOFT DELETION SUPPORT
-- ============================================================================

ALTER TABLE owners
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;

ALTER TABLE property_managers
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;

ALTER TABLE properties
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;

ALTER TABLE tenants
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;

ALTER TABLE vendors
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;

ALTER TABLE requests
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN deleted_at TIMESTAMPTZ NULL;

CREATE INDEX idx_owners_is_active ON owners(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_property_managers_is_active ON property_managers(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_properties_is_active ON properties(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_tenants_is_active ON tenants(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_vendors_is_active ON vendors(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_requests_is_active ON requests(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 2. UNITS TABLE
-- ============================================================================

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    bedrooms INTEGER,
    bathrooms NUMERIC(3,1),
    square_feet INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (property_id, unit_number)
);

CREATE INDEX idx_units_property_id ON units(property_id);

CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. TENANT REFACTOR (property_id + unit -> unit_id)
-- ============================================================================

-- Backfill units from existing tenant rows (run after 003_seed_data.sql)
INSERT INTO units (property_id, unit_number, created_at, updated_at)
SELECT property_id, unit, MIN(created_at), MAX(updated_at)
FROM tenants
WHERE unit IS NOT NULL
GROUP BY property_id, unit
ON CONFLICT (property_id, unit_number) DO NOTHING;

ALTER TABLE tenants ADD COLUMN unit_id UUID REFERENCES units(id) ON DELETE RESTRICT;

UPDATE tenants t
SET unit_id = u.id
FROM units u
WHERE u.property_id = t.property_id
  AND u.unit_number = t.unit;

ALTER TABLE tenants ALTER COLUMN unit_id SET NOT NULL;

DROP INDEX IF EXISTS idx_tenants_property_id;

ALTER TABLE tenants DROP CONSTRAINT tenants_property_id_fkey;
ALTER TABLE tenants DROP COLUMN property_id;
ALTER TABLE tenants DROP COLUMN unit;

CREATE INDEX idx_tenants_unit_id ON tenants(unit_id);

-- ============================================================================
-- 4. FOREIGN KEY HARDENING
-- ============================================================================

ALTER TABLE properties DROP CONSTRAINT properties_owner_id_fkey;
ALTER TABLE properties
    ADD CONSTRAINT properties_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE RESTRICT;

ALTER TABLE requests DROP CONSTRAINT requests_requester_id_fkey;
ALTER TABLE requests
    ADD CONSTRAINT requests_requester_id_fkey
    FOREIGN KEY (requester_id) REFERENCES tenants(id) ON DELETE RESTRICT;

-- ============================================================================
-- 5. REQUEST ATTACHMENTS
-- ============================================================================

CREATE TABLE request_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    uploaded_by UUID,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_request_attachments_request_id ON request_attachments(request_id);

-- ============================================================================
-- 6. REQUEST STATUS HISTORY
-- ============================================================================

CREATE TABLE request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    old_status request_status,
    new_status request_status NOT NULL,
    changed_by UUID,
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_request_status_history_request_id ON request_status_history(request_id);
CREATE INDEX idx_request_status_history_changed_at ON request_status_history(changed_at);

-- Backfill initial status history from existing requests
INSERT INTO request_status_history (request_id, old_status, new_status, changed_at)
SELECT id, NULL, status, created_at
FROM requests;

-- ============================================================================
-- 7. VENDOR ASSIGNMENT HISTORY
-- ============================================================================

CREATE TABLE request_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    assigned_by UUID,
    status VARCHAR(50),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_request_assignments_request_id ON request_assignments(request_id);
CREATE INDEX idx_request_assignments_vendor_id ON request_assignments(vendor_id);

-- Backfill current vendor assignments from requests.vendor_id
INSERT INTO request_assignments (request_id, vendor_id, status, assigned_at)
SELECT id, vendor_id, 'assigned', updated_at
FROM requests
WHERE vendor_id IS NOT NULL;

-- ============================================================================
-- 8. USER ACCOUNTS (AUTH MAPPING)
-- ============================================================================

CREATE TABLE user_accounts (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,
    owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES property_managers(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_role ON user_accounts(role);

-- ============================================================================
-- 9. RLS FOR NEW TABLES + POLICY FIXES (tenant -> unit -> property)
-- ============================================================================

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Fix properties policy: tenant access via unit
DROP POLICY IF EXISTS "Tenants can view own property" ON properties;
CREATE POLICY "Tenants can view own property"
    ON properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenants t
            JOIN units u ON u.id = t.unit_id
            WHERE u.property_id = properties.id
            AND t.id = auth.uid()::uuid
        )
    );

-- Fix tenant policies: resolve property through units
DROP POLICY IF EXISTS "Managers can view tenants of managed properties" ON tenants;
CREATE POLICY "Managers can view tenants of managed properties"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM units u
            JOIN manager_properties mp ON mp.property_id = u.property_id
            WHERE u.id = tenants.unit_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "Owners can view tenants of owned properties" ON tenants;
CREATE POLICY "Owners can view tenants of owned properties"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM units u
            JOIN owner_properties op ON op.property_id = u.property_id
            WHERE u.id = tenants.unit_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

DROP POLICY IF EXISTS "Managers can update tenants of managed properties" ON tenants;
CREATE POLICY "Managers can update tenants of managed properties"
    ON tenants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM units u
            JOIN manager_properties mp ON mp.property_id = u.property_id
            WHERE u.id = tenants.unit_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- Units policies
CREATE POLICY "Tenants can view own unit"
    ON units FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.unit_id = units.id
            AND tenants.id = auth.uid()::uuid
        )
    );

CREATE POLICY "Managers can view units of managed properties"
    ON units FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties mp
            WHERE mp.property_id = units.property_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners can view units of owned properties"
    ON units FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM owner_properties op
            WHERE op.property_id = units.property_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- Request child table policies (mirror conversation_messages pattern)
CREATE POLICY "Tenants can view request attachments"
    ON request_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = request_attachments.request_id
            AND requests.requester_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Managers can view request attachments"
    ON request_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN manager_properties mp ON r.property_id = mp.property_id
            WHERE r.id = request_attachments.request_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners can view request attachments"
    ON request_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN owner_properties op ON r.property_id = op.property_id
            WHERE r.id = request_attachments.request_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Tenants can view request status history"
    ON request_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = request_status_history.request_id
            AND requests.requester_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Managers can view request status history"
    ON request_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN manager_properties mp ON r.property_id = mp.property_id
            WHERE r.id = request_status_history.request_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners can view request status history"
    ON request_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN owner_properties op ON r.property_id = op.property_id
            WHERE r.id = request_status_history.request_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Tenants can view request assignments"
    ON request_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = request_assignments.request_id
            AND requests.requester_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Managers can view request assignments"
    ON request_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN manager_properties mp ON r.property_id = mp.property_id
            WHERE r.id = request_assignments.request_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners can view request assignments"
    ON request_assignments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN owner_properties op ON r.property_id = op.property_id
            WHERE r.id = request_assignments.request_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Users can view own account"
    ON user_accounts FOR SELECT
    USING (id = auth.uid()::uuid);

COMMIT;
