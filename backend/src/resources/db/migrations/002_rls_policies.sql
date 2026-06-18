-- Row Level Security (RLS) Policies for Ranting Chant
-- This migration enables RLS and creates policies for all tables

-- ============================================================================
-- AUTHORIZATION HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION current_actor_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ua.actor_id
    FROM user_accounts ua
    WHERE ua.auth_user_id = auth.uid()
    AND ua.role IN ('owner', 'manager')
$$;

CREATE OR REPLACE FUNCTION current_actor_is_manager_or_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM actors a
        WHERE a.id = current_actor_id()
        AND a.type IN ('owner', 'manager')
        AND a.is_active = true
    )
$$;

CREATE OR REPLACE FUNCTION actor_can_access_request(
    p_request_id UUID,
    p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM requests r
        WHERE r.id = p_request_id
        AND (
            r.requester_id = p_actor_id
            OR r.vendor_id = p_actor_id
            OR EXISTS (
                SELECT 1
                FROM request_involved_parties rip
                WHERE rip.request_id = r.id
                AND rip.actor_id = p_actor_id
            )
            OR EXISTS (
                SELECT 1
                FROM manager_properties mp
                WHERE mp.property_id = r.property_id
                AND mp.manager_id = p_actor_id
            )
            OR EXISTS (
                SELECT 1
                FROM owner_properties op
                WHERE op.property_id = r.property_id
                AND op.owner_id = p_actor_id
            )
            OR EXISTS (
                SELECT 1
                FROM tenants t
                JOIN units u
                    ON u.id = t.unit_id
                JOIN manager_properties mp
                    ON mp.property_id = u.property_id
                WHERE t.id = r.requester_id
                AND mp.manager_id = p_actor_id
            )
            OR EXISTS (
                SELECT 1
                FROM tenants t
                JOIN units u
                    ON u.id = t.unit_id
                JOIN owner_properties op
                    ON op.property_id = u.property_id
                WHERE t.id = r.requester_id
                AND op.owner_id = p_actor_id
            )
        )
    );
$$;

CREATE OR REPLACE FUNCTION actor_can_access_property(
    p_property_id UUID,
    p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM owner_properties op
        WHERE op.property_id = p_property_id
        AND op.owner_id = p_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM manager_properties mp
        WHERE mp.property_id = p_property_id
        AND mp.manager_id = p_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM tenants t
        JOIN units u
            ON u.id = t.unit_id
        WHERE t.id = p_actor_id
        AND u.property_id = p_property_id
    )
    OR EXISTS (
        SELECT 1
        FROM requests r
        WHERE r.property_id = p_property_id
        AND actor_can_access_request(r.id, p_actor_id)
    );
$$;

CREATE OR REPLACE FUNCTION actor_can_manage_property(
    p_property_id UUID,
    p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM owner_properties op
        WHERE op.property_id = p_property_id
        AND op.owner_id = p_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM manager_properties mp
        WHERE mp.property_id = p_property_id
        AND mp.manager_id = p_actor_id
    );
$$;

CREATE OR REPLACE FUNCTION actor_can_access_actor(
    p_visible_actor_id UUID,
    p_actor_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p_visible_actor_id = p_actor_id
    OR EXISTS (
        SELECT 1
        FROM owner_properties op_self
        JOIN owner_properties op_visible
            ON op_visible.property_id = op_self.property_id
        WHERE op_self.owner_id = p_actor_id
        AND op_visible.owner_id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM manager_properties mp_self
        JOIN manager_properties mp_visible
            ON mp_visible.property_id = mp_self.property_id
        WHERE mp_self.manager_id = p_actor_id
        AND mp_visible.manager_id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM owner_properties op
        JOIN manager_properties mp
            ON mp.property_id = op.property_id
        WHERE op.owner_id = p_actor_id
        AND mp.manager_id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM manager_properties mp
        JOIN owner_properties op
            ON op.property_id = mp.property_id
        WHERE mp.manager_id = p_actor_id
        AND op.owner_id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM owner_properties op
        JOIN units u
            ON u.property_id = op.property_id
        JOIN tenants t
            ON t.unit_id = u.id
        WHERE op.owner_id = p_actor_id
        AND t.id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM manager_properties mp
        JOIN units u
            ON u.property_id = mp.property_id
        JOIN tenants t
            ON t.unit_id = u.id
        WHERE mp.manager_id = p_actor_id
        AND t.id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM tenants t_self
        JOIN units u_self
            ON u_self.id = t_self.unit_id
        JOIN owner_properties op
            ON op.property_id = u_self.property_id
        WHERE t_self.id = p_actor_id
        AND op.owner_id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM tenants t_self
        JOIN units u_self
            ON u_self.id = t_self.unit_id
        JOIN manager_properties mp
            ON mp.property_id = u_self.property_id
        WHERE t_self.id = p_actor_id
        AND mp.manager_id = p_visible_actor_id
    )
    OR EXISTS (
        SELECT 1
        FROM requests r
        LEFT JOIN request_involved_parties rip_visible
            ON rip_visible.request_id = r.id
        WHERE actor_can_access_request(r.id, p_actor_id)
        AND (
            r.requester_id = p_visible_actor_id
            OR r.vendor_id = p_visible_actor_id
            OR rip_visible.actor_id = p_visible_actor_id
        )
    );
$$;

-- Enable RLS on all tables
ALTER TABLE actors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE manager_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_involved_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ACTORS TABLE POLICIES
-- ============================================================================

-- Actors can read actor records they are allowed to see
CREATE POLICY "Actors can view accessible actor records"
    ON actors FOR SELECT
    USING (actor_can_access_actor(id, current_actor_id()));

-- Managers and owners can read vendor actor records for the vendor directory
CREATE POLICY "Managers and owners can view vendor actors"
    ON actors FOR SELECT
    USING (
        type = 'vendor'
        AND current_actor_is_manager_or_owner()
    );

-- Actors can update their own identity record
CREATE POLICY "Actors can update own record"
    ON actors FOR UPDATE
    USING (current_actor_id() = id)
    WITH CHECK (current_actor_id() = id);

-- Owners and managers can create tenant contact records
CREATE POLICY "Owners and managers can create tenant actors"
    ON actors FOR INSERT
    WITH CHECK (
        current_actor_is_manager_or_owner()
        AND type = 'tenant'
    );

-- Owners and managers can create vendor contact records
CREATE POLICY "Owners and managers can create vendor actors"
    ON actors FOR INSERT
    WITH CHECK (
        current_actor_is_manager_or_owner()
        AND type = 'vendor'
    );

-- Owners and managers can update tenant contact records for related properties
CREATE POLICY "Owners and managers can update related tenant actors"
    ON actors FOR UPDATE
    USING (
        type = 'tenant'
        AND EXISTS (
            SELECT 1
            FROM tenants t
            JOIN units u
                ON u.id = t.unit_id
            WHERE t.id = actors.id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    )
    WITH CHECK (
        type = 'tenant'
        AND EXISTS (
            SELECT 1
            FROM tenants t
            JOIN units u
                ON u.id = t.unit_id
            WHERE t.id = actors.id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    );

-- Owners and managers can update vendor contact records
CREATE POLICY "Owners and managers can update vendor actors"
    ON actors FOR UPDATE
    USING (
        type = 'vendor'
        AND current_actor_is_manager_or_owner()
    )
    WITH CHECK (
        type = 'vendor'
        AND current_actor_is_manager_or_owner()
    );

-- ============================================================================
-- USER ACCOUNTS TABLE POLICIES
-- ============================================================================

-- Users can read their own login mapping
CREATE POLICY "Users can view own account"
    ON user_accounts FOR SELECT
    USING (auth_user_id = auth.uid());

-- Users can update non-role account metadata on their own mapping
CREATE POLICY "Users can update own account"
    ON user_accounts FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (
        auth_user_id = auth.uid()
        AND actor_id = current_actor_id()
        AND role IN ('owner', 'manager')
    );

-- ============================================================================
-- OWNERS TABLE POLICIES
-- ============================================================================

-- Actors can read owner records they are allowed to see
CREATE POLICY "Actors can view accessible owner records"
    ON owners FOR SELECT
    USING (actor_can_access_actor(id, current_actor_id()));

-- Owners can update their own record
CREATE POLICY "Owners can update own record"
    ON owners FOR UPDATE
    USING (current_actor_id() = id)
    WITH CHECK (current_actor_id() = id);

-- ============================================================================
-- PROPERTY MANAGERS TABLE POLICIES
-- ============================================================================

-- Actors can read property manager records they are allowed to see
CREATE POLICY "Actors can view accessible manager records"
    ON property_managers FOR SELECT
    USING (actor_can_access_actor(id, current_actor_id()));

-- Property managers can update their own record
CREATE POLICY "Managers can update own record"
    ON property_managers FOR UPDATE
    USING (current_actor_id() = id)
    WITH CHECK (current_actor_id() = id);

-- ============================================================================
-- VENDORS TABLE POLICIES
-- ============================================================================

-- Authenticated actors can read the vendor directory
CREATE POLICY "Authenticated actors can view vendors"
    ON vendors FOR SELECT
    USING (current_actor_id() IS NOT NULL);

-- Vendors can update their own vendor record
CREATE POLICY "Vendors can update own record"
    ON vendors FOR UPDATE
    USING (current_actor_id() = id)
    WITH CHECK (current_actor_id() = id);

-- Property managers can create vendors
CREATE POLICY "Managers can create vendors"
    ON vendors FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = current_actor_id()
        )
    );

-- Property managers can update vendors
CREATE POLICY "Managers can update vendors"
    ON vendors FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = current_actor_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = current_actor_id()
        )
    );

-- Property managers can delete vendors
CREATE POLICY "Managers can delete vendors"
    ON vendors FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = current_actor_id()
        )
    );

-- ============================================================================
-- PROPERTIES TABLE POLICIES
-- ============================================================================

-- Actors can read properties they are related to
CREATE POLICY "Actors can view accessible properties"
    ON properties FOR SELECT
    USING (actor_can_access_property(id, current_actor_id()));

-- Owners and property managers can update properties they manage
CREATE POLICY "Owners and managers can update related properties"
    ON properties FOR UPDATE
    USING (actor_can_manage_property(id, current_actor_id()))
    WITH CHECK (actor_can_manage_property(id, current_actor_id()));

-- Owners and property managers can create properties
CREATE POLICY "Owners and managers can create properties"
    ON properties FOR INSERT
    WITH CHECK (
        current_actor_is_manager_or_owner()
        AND created_by = current_actor_id()
    );

-- ============================================================================
-- UNITS TABLE POLICIES
-- ============================================================================

-- Actors can read units for properties they are related to
CREATE POLICY "Actors can view units for accessible properties"
    ON units FOR SELECT
    USING (actor_can_access_property(property_id, current_actor_id()));

-- Owners and property managers can manage units for related properties
CREATE POLICY "Owners and managers can manage units for related properties"
    ON units FOR ALL
    USING (actor_can_manage_property(property_id, current_actor_id()))
    WITH CHECK (actor_can_manage_property(property_id, current_actor_id()));

-- ============================================================================
-- TENANTS TABLE POLICIES
-- ============================================================================

-- Owners and managers can read tenants of related properties
CREATE POLICY "Owners and managers can view related tenants"
    ON tenants FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM units u
            WHERE u.id = tenants.unit_id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    );

-- Owners and property managers can create tenants for properties they manage
CREATE POLICY "Owners and managers can create related tenants"
    ON tenants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM units u
            WHERE u.id = tenants.unit_id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    );

-- Owners and property managers can update tenants of properties they manage
CREATE POLICY "Owners and managers can update related tenants"
    ON tenants FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM units u
            WHERE u.id = tenants.unit_id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM units u
            WHERE u.id = tenants.unit_id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    );

-- ============================================================================
-- OWNER PROPERTIES TABLE POLICIES
-- ============================================================================

-- Actors can view owner-property relationships for accessible properties
CREATE POLICY "Actors can view accessible owner property relationships"
    ON owner_properties FOR SELECT
    USING (actor_can_access_property(property_id, current_actor_id()));

-- Owners can attach themselves to newly created properties
CREATE POLICY "Owners can create own property relationships"
    ON owner_properties FOR INSERT
    WITH CHECK (
        owner_id = current_actor_id()
        AND EXISTS (
            SELECT 1
            FROM owners o
            WHERE o.id = current_actor_id()
        )
        AND (
            actor_can_manage_property(owner_properties.property_id, current_actor_id())
            OR EXISTS (
                SELECT 1
                FROM properties p
                WHERE p.id = owner_properties.property_id
                AND p.created_by = current_actor_id()
            )
        )
    );

-- ============================================================================
-- MANAGER PROPERTIES TABLE POLICIES
-- ============================================================================

-- Actors can view manager-property relationships for accessible properties
CREATE POLICY "Actors can view accessible manager property relationships"
    ON manager_properties FOR SELECT
    USING (actor_can_access_property(property_id, current_actor_id()));

-- Managers can attach themselves to newly created properties
CREATE POLICY "Managers can create own property relationships"
    ON manager_properties FOR INSERT
    WITH CHECK (
        manager_id = current_actor_id()
        AND EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = current_actor_id()
        )
        AND (
            actor_can_manage_property(manager_properties.property_id, current_actor_id())
            OR EXISTS (
                SELECT 1
                FROM properties p
                WHERE p.id = manager_properties.property_id
                AND p.created_by = current_actor_id()
            )
        )
    );

-- Owners can assign managers to properties they own or manage
CREATE POLICY "Owners can assign managers to related properties"
    ON manager_properties FOR INSERT
    WITH CHECK (
        actor_can_manage_property(manager_properties.property_id, current_actor_id())
        AND EXISTS (
            SELECT 1
            FROM owners o
            WHERE o.id = current_actor_id()
        )
        AND EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = manager_id
        )
    );

-- ============================================================================
-- VENDOR SERVICES TABLE POLICIES
-- ============================================================================

-- Authenticated actors can read vendor services
CREATE POLICY "Authenticated actors can view vendor services"
    ON vendor_services FOR SELECT
    USING (current_actor_id() IS NOT NULL);

-- Vendors can manage their own services
CREATE POLICY "Vendors can manage own services"
    ON vendor_services FOR ALL
    USING (vendor_id = current_actor_id())
    WITH CHECK (vendor_id = current_actor_id());

-- Property managers can manage vendor services
CREATE POLICY "Managers can manage vendor services"
    ON vendor_services FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = current_actor_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM property_managers pm
            WHERE pm.id = current_actor_id()
        )
    );

-- ============================================================================
-- REQUESTS TABLE POLICIES
-- ============================================================================

-- Actors can read requests they are allowed to access
CREATE POLICY "Actors can view accessible requests"
    ON requests FOR SELECT
    USING (actor_can_access_request(id, current_actor_id()));

-- Owners and managers can update requests for related properties
CREATE POLICY "Owners and managers can update related property requests"
    ON requests FOR UPDATE
    USING (
        actor_can_manage_property(property_id, current_actor_id())
        OR EXISTS (
            SELECT 1
            FROM tenants t
            JOIN units u
                ON u.id = t.unit_id
            WHERE t.id = requests.requester_id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    )
    WITH CHECK (
        actor_can_manage_property(property_id, current_actor_id())
        OR EXISTS (
            SELECT 1
            FROM tenants t
            JOIN units u
                ON u.id = t.unit_id
            WHERE t.id = requests.requester_id
            AND actor_can_manage_property(u.property_id, current_actor_id())
        )
    );

-- ============================================================================
-- REQUEST INVOLVED PARTIES TABLE POLICIES
-- ============================================================================

-- Actors can read involvement rows for requests they can access
CREATE POLICY "Actors can view involved parties for accessible requests"
    ON request_involved_parties FOR SELECT
    USING (actor_can_access_request(request_id, current_actor_id()));

-- Owners and property managers can manage involved parties for related property requests
CREATE POLICY "Owners and managers can manage involved parties for related requests"
    ON request_involved_parties FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM requests r
            WHERE r.id = request_involved_parties.request_id
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
        EXISTS (
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

-- ============================================================================
-- CONVERSATION MESSAGES TABLE POLICIES
-- ============================================================================

-- Actors can read messages for requests they can access
CREATE POLICY "Actors can view conversation messages for accessible requests"
    ON conversation_messages FOR SELECT
    USING (actor_can_access_request(request_id, current_actor_id()));

-- Actors can create messages for requests they can access
CREATE POLICY "Actors can create conversation messages for accessible requests"
    ON conversation_messages FOR INSERT
    WITH CHECK (actor_can_access_request(request_id, current_actor_id()));

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Actors can read notifications for requests they can access
CREATE POLICY "Actors can view notifications for accessible requests"
    ON notifications FOR SELECT
    USING (
        recipient_actor_id = current_actor_id()
        OR actor_can_access_request(request_id, current_actor_id())
    );

-- Owners and property managers can create notifications for related property requests
CREATE POLICY "Owners and managers can create notifications for related requests"
    ON notifications FOR INSERT
    WITH CHECK (
        EXISTS (
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
