-- Initial Schema for Ranting Chant
-- This migration creates all tables for the property management system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'pending_approval', 'escalated', 'resolved', 'cancelled');
CREATE TYPE request_urgency AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE request_type AS ENUM ('plumbing', 'electrical', 'hvac', 'appliance', 'pest_control', 'lockout', 'access_control', 'noise', 'lease_question', 'rent_payment', 'emergency', 'general');
CREATE TYPE property_type AS ENUM ('apartment_building', 'loft_building', 'modern_apartment_complex', 'single_family_home', 'townhouse', 'condominium');
CREATE TYPE notification_type AS ENUM ('email', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE message_role AS ENUM ('ai', 'tenant');
CREATE TYPE representative_type AS ENUM ('property_manager', 'owner');

-- Owners table
CREATE TABLE owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property Managers table
CREATE TABLE property_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    year_built INTEGER,
    property_type property_type NOT NULL,
    unit_count INTEGER NOT NULL,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES property_managers(id) ON DELETE SET NULL,
    representative_type representative_type NOT NULL,
    representative_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to validate representative_id exists in the appropriate table
CREATE OR REPLACE FUNCTION check_property_representative()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.representative_type = 'property_manager' THEN
        IF NOT EXISTS (SELECT 1 FROM property_managers WHERE id = NEW.representative_id) THEN
            RAISE EXCEPTION 'Representative ID % must exist in property_managers when representative_type is property_manager', NEW.representative_id;
        END IF;
    ELSIF NEW.representative_type = 'owner' THEN
        IF NOT EXISTS (SELECT 1 FROM owners WHERE id = NEW.representative_id) THEN
            RAISE EXCEPTION 'Representative ID % must exist in owners when representative_type is owner', NEW.representative_id;
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid representative_type %', NEW.representative_type;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_property_representative
BEFORE INSERT OR UPDATE ON properties
FOR EACH ROW EXECUTE FUNCTION check_property_representative();

-- Junction table for owner-property relationships (many-to-many)
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

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    unit VARCHAR(50),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors table
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    emergency_available BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for vendor services (many-to-many)
CREATE TABLE vendor_services (
    vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (vendor_id, service_name)
);

-- Requests table
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for request involved parties (many-to-many)
CREATE TABLE request_involved_parties (
    request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
    party_id UUID NOT NULL,
    party_type VARCHAR(50) NOT NULL, -- 'tenant', 'manager', 'owner'
    PRIMARY KEY (request_id, party_id, party_type)
);

-- Conversation messages table
CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    role message_role NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    recipient_type VARCHAR(50), -- 'manager', 'owner', 'vendor', 'tenant'
    status notification_status DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_tenants_property_id ON tenants(property_id);
CREATE INDEX idx_properties_owner_id ON properties(owner_id);
CREATE INDEX idx_properties_manager_id ON properties(manager_id);
CREATE INDEX idx_requests_requester_id ON requests(requester_id);
CREATE INDEX idx_requests_property_id ON requests(property_id);
CREATE INDEX idx_requests_vendor_id ON requests(vendor_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_type ON requests(type);
CREATE INDEX idx_requests_urgency ON requests(urgency);
CREATE INDEX idx_conversation_messages_request_id ON conversation_messages(request_id);
CREATE INDEX idx_notifications_request_id ON notifications(request_id);
CREATE INDEX idx_vendor_services_service_name ON vendor_services(service_name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_managers_updated_at BEFORE UPDATE ON property_managers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
