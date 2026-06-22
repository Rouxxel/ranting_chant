-- Initial Schema for Ranting Chant
-- This migration creates all tables for the property management system

-- Enable UUID and case-insensitive text extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- ENUMS
-- =========================

CREATE TYPE request_status AS ENUM (
    'pending',
    'in_progress',
    'pending_approval',
    'escalated',
    'resolved',
    'cancelled'
);

CREATE TYPE request_urgency AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE request_type AS ENUM (
    'plumbing',
    'electrical',
    'hvac',
    'appliance',
    'pest_control',
    'lockout',
    'access_control',
    'noise',
    'lease_question',
    'rent_payment',
    'emergency',
    'general'
);

CREATE TYPE property_type AS ENUM (
    'apartment_building',
    'condominium',
    'single_family_home',
    'townhouse',
    'commercial',
    'mixed_use',
    'industrial',
    'retail',
    'office'
);

CREATE TYPE notification_type AS ENUM ('email', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE message_role AS ENUM ('ai', 'tenant');

CREATE TYPE recipient_type AS ENUM (
    'tenant',
    'owner',
    'manager',
    'vendor'
);

-- =========================
-- ACTORS
-- =========================
-- Single identity layer for ALL participants in the system

CREATE TABLE actors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type recipient_type NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    email CITEXT,
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- USER ACCOUNTS
-- =========================
-- Supabase stores passwords in auth.users. This table maps login-capable
-- Supabase users to owner/manager actors in the application model.

CREATE TABLE user_accounts (
    auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    actor_id UUID UNIQUE NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    email CITEXT UNIQUE NOT NULL,
    username CITEXT UNIQUE,
    role recipient_type NOT NULL CHECK (role IN ('owner', 'manager')),
    provider VARCHAR(50) DEFAULT 'email',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION validate_user_account_actor_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM actors a
        WHERE a.id = NEW.actor_id
        AND a.type = NEW.role
        AND a.type IN ('owner', 'manager')
    ) THEN
        RAISE EXCEPTION 'user_accounts.actor_id must reference an owner or manager actor with a matching role';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_user_account_actor_role
    BEFORE INSERT OR UPDATE ON user_accounts
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_account_actor_role();

-- =========================
-- OWNERS
-- =========================

CREATE TABLE owners (
    id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- PROPERTY MANAGERS
-- =========================

CREATE TABLE property_managers (
    id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- VENDORS
-- =========================

CREATE TABLE vendors (
    id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
    emergency_available BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- PROPERTIES
-- =========================

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    year_built INTEGER,
    property_type property_type NOT NULL,
    unit_count INTEGER NOT NULL CHECK (unit_count >= 0),
    created_by UUID REFERENCES actors(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- UNITS
-- =========================

CREATE TABLE units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    bedrooms INTEGER,
    bathrooms NUMERIC(3,1),
    square_feet INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(property_id, unit_number)
);

-- =========================
-- TENANTS
-- =========================

CREATE TABLE tenants (
    id UUID PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- PROPERTY RELATIONSHIPS
-- =========================

CREATE TABLE owner_properties (
    owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    PRIMARY KEY (owner_id, property_id)
);

-- Junction table for manager-property relationships (many-to-many)
CREATE TABLE manager_properties (
    manager_id UUID REFERENCES property_managers(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    PRIMARY KEY (manager_id, property_id)
);

-- =========================
-- VENDOR SERVICES
-- =========================

CREATE TABLE vendor_services (
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (vendor_id, service_name)
);

-- =========================
-- REQUESTS
-- =========================

CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
    type request_type NOT NULL,
    description TEXT,
    status request_status DEFAULT 'pending',
    urgency request_urgency DEFAULT 'medium',
    escalated BOOLEAN DEFAULT false,
    sentiment VARCHAR(50),
    confidence DECIMAL(3,2),
    notification_pending BOOLEAN DEFAULT false,
    summary TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES actors(id) ON DELETE SET NULL,
    resolution_note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- REQUEST PARTICIPANTS (OPTION B CLEAN)
-- =========================

CREATE TABLE request_involved_parties (
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
    PRIMARY KEY (request_id, actor_id)
);

CREATE INDEX idx_request_participants_actor
ON request_involved_parties(actor_id);

-- =========================
-- MESSAGES
-- =========================

CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================
-- NOTIFICATIONS
-- =========================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    recipient_actor_id UUID REFERENCES actors(id) ON DELETE SET NULL,
    recipient_type recipient_type NOT NULL,
    status notification_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
