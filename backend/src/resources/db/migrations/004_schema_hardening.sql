-- Schema Hardening for Ranting Chant
-- Run after 001_initial_schema.sql, 002_rls_policies.sql, and 003_seed_data.sql

BEGIN;

-- ============================================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_actors_is_active
    ON actors(is_active)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_actors_type
    ON actors(type);

CREATE INDEX IF NOT EXISTS idx_properties_is_active
    ON properties(is_active)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_properties_created_by
    ON properties(created_by);

CREATE INDEX IF NOT EXISTS idx_tenants_is_active
    ON tenants(is_active)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_tenants_unit_id
    ON tenants(unit_id);

CREATE INDEX IF NOT EXISTS idx_requests_is_active
    ON requests(is_active)
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_requests_requester_id
    ON requests(requester_id);

CREATE INDEX IF NOT EXISTS idx_requests_property_id
    ON requests(property_id);

CREATE INDEX IF NOT EXISTS idx_requests_vendor_id
    ON requests(vendor_id);

CREATE INDEX IF NOT EXISTS idx_requests_resolved_by
    ON requests(resolved_by)
    WHERE resolved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requests_status
    ON requests(status);

CREATE INDEX IF NOT EXISTS idx_requests_urgency
    ON requests(urgency);

CREATE INDEX IF NOT EXISTS idx_requests_created_at
    ON requests(created_at);

-- ============================================================================
-- 2. REQUEST ATTACHMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS request_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES actors(id) ON DELETE SET NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_attachments_request_id
    ON request_attachments(request_id);

CREATE INDEX IF NOT EXISTS idx_request_attachments_uploaded_by
    ON request_attachments(uploaded_by);

-- ============================================================================
-- 3. REQUEST STATUS HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS request_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    old_status request_status,
    new_status request_status NOT NULL,
    changed_by UUID REFERENCES actors(id) ON DELETE SET NULL,
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_status_history_request_id
    ON request_status_history(request_id);

CREATE INDEX IF NOT EXISTS idx_request_status_history_changed_by
    ON request_status_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_request_status_history_changed_at
    ON request_status_history(changed_at);

-- Backfill initial status history from existing requests
INSERT INTO request_status_history (request_id, old_status, new_status, changed_at)
SELECT r.id, NULL, r.status, r.created_at
FROM requests r
WHERE NOT EXISTS (
    SELECT 1
    FROM request_status_history rsh
    WHERE rsh.request_id = r.id
    AND rsh.old_status IS NULL
    AND rsh.new_status = r.status
);

-- ============================================================================
-- 4. VENDOR ASSIGNMENT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS request_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES actors(id) ON DELETE SET NULL,
    status VARCHAR(50),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_request_assignments_request_id
    ON request_assignments(request_id);

CREATE INDEX IF NOT EXISTS idx_request_assignments_vendor_id
    ON request_assignments(vendor_id);

CREATE INDEX IF NOT EXISTS idx_request_assignments_assigned_by
    ON request_assignments(assigned_by);

CREATE INDEX IF NOT EXISTS idx_request_assignments_assigned_at
    ON request_assignments(assigned_at);

-- Backfill current vendor assignments from requests.vendor_id
INSERT INTO request_assignments (request_id, vendor_id, status, assigned_at)
SELECT r.id, r.vendor_id, 'assigned', r.updated_at
FROM requests r
WHERE r.vendor_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1
    FROM request_assignments ra
    WHERE ra.request_id = r.id
    AND ra.vendor_id = r.vendor_id
    AND ra.status = 'assigned'
);

-- ============================================================================
-- 5. USER ACCOUNTS (AUTH MAPPING)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_accounts (
    auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID UNIQUE NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    email CITEXT UNIQUE NOT NULL,
    username CITEXT UNIQUE,
    role recipient_type NOT NULL CHECK (role IN ('owner', 'manager')),
    provider VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email
    ON user_accounts(email);

CREATE INDEX IF NOT EXISTS idx_user_accounts_username
    ON user_accounts(username)
    WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_accounts_actor_id
    ON user_accounts(actor_id);

-- ============================================================================
-- 6. RLS FOR HARDENING TABLES
-- ============================================================================

ALTER TABLE request_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

-- Request attachments
DROP POLICY IF EXISTS "Actors can view request attachments for accessible requests"
    ON request_attachments;

CREATE POLICY "Actors can view request attachments for accessible requests"
    ON request_attachments FOR SELECT
    USING (actor_can_access_request(request_id, current_actor_id()));

DROP POLICY IF EXISTS "Actors can create request attachments for accessible requests"
    ON request_attachments;

CREATE POLICY "Actors can create request attachments for accessible requests"
    ON request_attachments FOR INSERT
    WITH CHECK (
        actor_can_access_request(request_id, current_actor_id())
        AND (
            uploaded_by IS NULL
            OR uploaded_by = current_actor_id()
        )
    );

DROP POLICY IF EXISTS "Owners and managers can delete request attachments for related requests"
    ON request_attachments;

CREATE POLICY "Owners and managers can delete request attachments for related requests"
    ON request_attachments FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM requests r
            WHERE r.id = request_attachments.request_id
            AND (
                actor_can_manage_property(r.property_id, current_actor_id())
                OR EXISTS (
                    SELECT 1
                    FROM tenants t
                    JOIN units u
                        ON u.id = t.unit_id
                    WHERE t.id = r.requester_id
                    AND actor_can_manage_property(u.property_id, current_actor_id())
                )
            )
        )
    );

-- Request status history
DROP POLICY IF EXISTS "Actors can view request status history for accessible requests"
    ON request_status_history;

CREATE POLICY "Actors can view request status history for accessible requests"
    ON request_status_history FOR SELECT
    USING (actor_can_access_request(request_id, current_actor_id()));

DROP POLICY IF EXISTS "Owners and managers can create request status history for related requests"
    ON request_status_history;

CREATE POLICY "Owners and managers can create request status history for related requests"
    ON request_status_history FOR INSERT
    WITH CHECK (
        (
            changed_by IS NULL
            OR changed_by = current_actor_id()
        )
        AND EXISTS (
            SELECT 1
            FROM requests r
            WHERE r.id = request_id
            AND (
                actor_can_manage_property(r.property_id, current_actor_id())
                OR EXISTS (
                    SELECT 1
                    FROM tenants t
                    JOIN units u
                        ON u.id = t.unit_id
                    WHERE t.id = r.requester_id
                    AND actor_can_manage_property(u.property_id, current_actor_id())
                )
            )
        )
    );

-- Request assignments
DROP POLICY IF EXISTS "Actors can view request assignments for accessible requests"
    ON request_assignments;

CREATE POLICY "Actors can view request assignments for accessible requests"
    ON request_assignments FOR SELECT
    USING (
        actor_can_access_request(request_id, current_actor_id())
        OR vendor_id = current_actor_id()
    );

DROP POLICY IF EXISTS "Owners and managers can manage request assignments for related requests"
    ON request_assignments;

CREATE POLICY "Owners and managers can manage request assignments for related requests"
    ON request_assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM requests r
            WHERE r.id = request_assignments.request_id
            AND (
                actor_can_manage_property(r.property_id, current_actor_id())
                OR EXISTS (
                    SELECT 1
                    FROM tenants t
                    JOIN units u
                        ON u.id = t.unit_id
                    WHERE t.id = r.requester_id
                    AND actor_can_manage_property(u.property_id, current_actor_id())
                )
            )
        )
    )
    WITH CHECK (
        (
            assigned_by IS NULL
            OR assigned_by = current_actor_id()
        )
        AND EXISTS (
            SELECT 1
            FROM requests r
            WHERE r.id = request_id
            AND (
                actor_can_manage_property(r.property_id, current_actor_id())
                OR EXISTS (
                    SELECT 1
                    FROM tenants t
                    JOIN units u
                        ON u.id = t.unit_id
                    WHERE t.id = r.requester_id
                    AND actor_can_manage_property(u.property_id, current_actor_id())
                )
            )
        )
    );

-- User accounts
DROP POLICY IF EXISTS "Users can view own account"
    ON user_accounts;

CREATE POLICY "Users can view own account"
    ON user_accounts FOR SELECT
    USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own account"
    ON user_accounts;

CREATE POLICY "Users can update own account"
    ON user_accounts FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (
        auth_user_id = auth.uid()
        AND actor_id = current_actor_id()
        AND role IN ('owner', 'manager')
    );

COMMIT;
