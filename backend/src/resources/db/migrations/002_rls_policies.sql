-- Row Level Security (RLS) Policies for Ranting Chant
-- This migration enables RLS and creates policies for all tables

-- Enable RLS on all tables
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_involved_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OWNERS TABLE POLICIES
-- ============================================================================

-- Owners can read their own record
CREATE POLICY "Owners can view own record"
    ON owners FOR SELECT
    USING (auth.uid()::text = id::text);

-- Owners can update their own record
CREATE POLICY "Owners can update own record"
    ON owners FOR UPDATE
    USING (auth.uid()::text = id::text);

-- Property managers can read owners of properties they manage
CREATE POLICY "Managers can view owners of managed properties"
    ON owners FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            JOIN manager_properties mp ON p.id = mp.property_id
            WHERE p.owner_id = owners.id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- ============================================================================
-- PROPERTY MANAGERS TABLE POLICIES
-- ============================================================================

-- Property managers can read their own record
CREATE POLICY "Managers can view own record"
    ON property_managers FOR SELECT
    USING (auth.uid()::text = id::text);

-- Property managers can update their own record
CREATE POLICY "Managers can update own record"
    ON property_managers FOR UPDATE
    USING (auth.uid()::text = id::text);

-- Owners can read managers of their properties
CREATE POLICY "Owners can view managers of owned properties"
    ON property_managers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM properties p
            JOIN owner_properties op ON p.id = op.property_id
            WHERE p.manager_id = property_managers.id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- ============================================================================
-- PROPERTIES TABLE POLICIES
-- ============================================================================

-- Owners can read properties they own
CREATE POLICY "Owners can view owned properties"
    ON properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM owner_properties
            WHERE property_id = properties.id
            AND owner_id = auth.uid()::uuid
        )
    );

-- Property managers can read properties they manage
CREATE POLICY "Managers can view managed properties"
    ON properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties
            WHERE property_id = properties.id
            AND manager_id = auth.uid()::uuid
        )
    );

-- Tenants can read their own property
CREATE POLICY "Tenants can view own property"
    ON properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenants
            WHERE tenants.property_id = properties.id
            AND tenants.id = auth.uid()::uuid
        )
    );

-- Owners can update properties they own
CREATE POLICY "Owners can update owned properties"
    ON properties FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM owner_properties
            WHERE property_id = properties.id
            AND owner_id = auth.uid()::uuid
        )
    );

-- Property managers can update properties they manage
CREATE POLICY "Managers can update managed properties"
    ON properties FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties
            WHERE property_id = properties.id
            AND manager_id = auth.uid()::uuid
        )
    );

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Tenants can read their own record
CREATE POLICY "Tenants can view own record"
    ON tenants FOR SELECT
    USING (auth.uid()::text = id::text);

-- Tenants can update their own record
CREATE POLICY "Tenants can update own record"
    ON tenants FOR UPDATE
    USING (auth.uid()::text = id::text);

-- Property managers can read tenants of properties they manage
CREATE POLICY "Managers can view tenants of managed properties"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties mp
            WHERE mp.property_id = tenants.property_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- Owners can read tenants of properties they own
CREATE POLICY "Owners can view tenants of owned properties"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM owner_properties op
            WHERE op.property_id = tenants.property_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- Property managers can update tenants of properties they manage
CREATE POLICY "Managers can update tenants of managed properties"
    ON tenants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties mp
            WHERE mp.property_id = tenants.property_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- ============================================================================
-- VENDORS TABLE POLICIES
-- ============================================================================

-- Public read access for vendors (directory)
CREATE POLICY "Public can view vendors"
    ON vendors FOR SELECT
    USING (true);

-- Property managers can create vendors
CREATE POLICY "Managers can create vendors"
    ON vendors FOR INSERT
    WITH CHECK (true);

-- Property managers can update vendors
CREATE POLICY "Managers can update vendors"
    ON vendors FOR UPDATE
    USING (true);

-- Property managers can delete vendors
CREATE POLICY "Managers can delete vendors"
    ON vendors FOR DELETE
    USING (true);

-- ============================================================================
-- REQUESTS TABLE POLICIES
-- ============================================================================

-- Tenants can read their own requests
CREATE POLICY "Tenants can view own requests"
    ON requests FOR SELECT
    USING (requester_id = auth.uid()::uuid);

-- Property managers can read requests for properties they manage
CREATE POLICY "Managers can view requests for managed properties"
    ON requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties mp
            WHERE mp.property_id = requests.property_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- Owners can read requests for properties they own
CREATE POLICY "Owners can view requests for owned properties"
    ON requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM owner_properties op
            WHERE op.property_id = requests.property_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- Tenants can create requests
CREATE POLICY "Tenants can create requests"
    ON requests FOR INSERT
    WITH CHECK (requester_id = auth.uid()::uuid);

-- Tenants can update their own requests
CREATE POLICY "Tenants can update own requests"
    ON requests FOR UPDATE
    USING (requester_id = auth.uid()::uuid);

-- Property managers can update requests for managed properties
CREATE POLICY "Managers can update requests for managed properties"
    ON requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties mp
            WHERE mp.property_id = requests.property_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- Owners can update requests for owned properties
CREATE POLICY "Owners can update requests for owned properties"
    ON requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM owner_properties op
            WHERE op.property_id = requests.property_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- ============================================================================
-- CONVERSATION MESSAGES TABLE POLICIES
-- ============================================================================

-- Tenants can read messages for their own requests
CREATE POLICY "Tenants can view conversation messages"
    ON conversation_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = conversation_messages.request_id
            AND requests.requester_id = auth.uid()::uuid
        )
    );

-- Property managers can read messages for managed property requests
CREATE POLICY "Managers can view conversation messages"
    ON conversation_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN manager_properties mp ON r.property_id = mp.property_id
            WHERE r.id = conversation_messages.request_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- Owners can read messages for owned property requests
CREATE POLICY "Owners can view conversation messages"
    ON conversation_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN owner_properties op ON r.property_id = op.property_id
            WHERE r.id = conversation_messages.request_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Tenants can read notifications for their own requests
CREATE POLICY "Tenants can view notifications"
    ON notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = notifications.request_id
            AND requests.requester_id = auth.uid()::uuid
        )
    );

-- Property managers can read notifications for managed property requests
CREATE POLICY "Managers can view notifications"
    ON notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN manager_properties mp ON r.property_id = mp.property_id
            WHERE r.id = notifications.request_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- Owners can read notifications for owned property requests
CREATE POLICY "Owners can view notifications"
    ON notifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN owner_properties op ON r.property_id = op.property_id
            WHERE r.id = notifications.request_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- ============================================================================
-- JUNCTION TABLE POLICIES
-- ============================================================================

-- Owner properties
CREATE POLICY "Owners can view own property relationships"
    ON owner_properties FOR SELECT
    USING (owner_id = auth.uid()::uuid);

CREATE POLICY "Managers can view property relationships for managed properties"
    ON owner_properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM manager_properties mp
            WHERE mp.property_id = owner_properties.property_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

-- Manager properties
CREATE POLICY "Managers can view own property relationships"
    ON manager_properties FOR SELECT
    USING (manager_id = auth.uid()::uuid);

CREATE POLICY "Owners can view property relationships for owned properties"
    ON manager_properties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM owner_properties op
            WHERE op.property_id = manager_properties.property_id
            AND op.owner_id = auth.uid()::uuid
        )
    );

-- Vendor services
CREATE POLICY "Public can view vendor services"
    ON vendor_services FOR SELECT
    USING (true);

CREATE POLICY "Managers can manage vendor services"
    ON vendor_services FOR ALL
    USING (true);

-- Request involved parties
CREATE POLICY "Tenants can view involved parties for own requests"
    ON request_involved_parties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests
            WHERE requests.id = request_involved_parties.request_id
            AND requests.requester_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Managers can view involved parties for managed properties"
    ON request_involved_parties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN manager_properties mp ON r.property_id = mp.property_id
            WHERE r.id = request_involved_parties.request_id
            AND mp.manager_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Owners can view involved parties for owned properties"
    ON request_involved_parties FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM requests r
            JOIN owner_properties op ON r.property_id = op.property_id
            WHERE r.id = request_involved_parties.request_id
            AND op.owner_id = auth.uid()::uuid
        )
    );
