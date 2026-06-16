-- Seed Data Migration Script
-- Generated from backend/src/resources/mock_db_jsons and normalized for the actor-based schema
-- Run this after applying 001_initial_schema.sql and 002_rls_policies.sql

BEGIN;

-- Compatibility for databases that already ran an older 001_initial_schema.sql
-- before request resolution fields were added.
ALTER TABLE requests
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_by UUID,
    ADD COLUMN IF NOT EXISTS resolution_note TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'requests_resolved_by_fkey'
        AND conrelid = 'requests'::regclass
    ) THEN
        ALTER TABLE requests
            ADD CONSTRAINT requests_resolved_by_fkey
            FOREIGN KEY (resolved_by)
            REFERENCES actors(id)
            ON DELETE SET NULL;
    END IF;
END;
$$;

-- Insert Actors
INSERT INTO actors (id, type, display_name, email, phone, created_at, updated_at) VALUES
('943c73d1-ceda-5578-abb0-db914d931f46', 'owner'::recipient_type, 'John Owner', 'johnowner@gmail.com', '+14155552673', NOW(), NOW()),
('078b51eb-4966-5e7f-8eae-d5151b79032e', 'owner'::recipient_type, 'Michael Sterling', 'michael.sterling@gmail.com', '+14155552673', NOW(), NOW()),
('2089cded-11ce-5f91-99ed-df5af744494f', 'owner'::recipient_type, 'Olivia Bennett', 'olivia.bennett@hotmail.com', '+14155552673', NOW(), NOW()),
('20616874-23e7-57f1-a558-b935495d6d5b', 'owner'::recipient_type, 'Robert Hayes', 'hayesrobert@gmail.com', '+14155552673', NOW(), NOW()),
('ed84c333-2c85-5ae5-9916-60f4d6c9921b', 'owner'::recipient_type, 'Sophia Reynolds', 'sreynolds@gmail.com', '+14155552673', NOW(), NOW()),
('ab7a3be3-4950-50b1-a1b6-6783aa7a4725', 'manager'::recipient_type, 'Sara Johnson', 'sarah@gmail.com', '+14155552673', NOW(), NOW()),
('2fa6c4e0-be26-5f52-bd7f-286d7dd34b80', 'manager'::recipient_type, 'David Reynolds', 'david.reynolds@gmail.com', '+14155552673', NOW(), NOW()),
('128b8f0f-5f80-5ded-a75d-06936e394c51', 'manager'::recipient_type, 'Laura Mitchell', 'laura.mitchell@gmail.com', '+15552224', NOW(), NOW()),
('197fb109-9e81-5753-a647-a71bdff88efd', 'manager'::recipient_type, 'Kevin Thompson', 'kevin.thompson@gmail.com', '+15552225', NOW(), NOW()),
('b1c4a072-618b-53a2-a16e-d2387c1efa14', 'tenant'::recipient_type, 'John Tenant', 'john@gmail.com', '+14155552673', NOW(), NOW()),
('63d3338d-9a5c-5fd2-a51b-d99483e9b25e', 'tenant'::recipient_type, 'John Hackathon', 'hckthnspecific@gmail.com', '+15552345', NOW(), NOW()),
('7b668b94-8223-5104-9e69-3d210db1bddb', 'tenant'::recipient_type, 'Michael Brown', 'michael.brown@example.com', '+15553456', NOW(), NOW()),
('5803e546-c51d-50b5-965a-862e45879d09', 'tenant'::recipient_type, 'Sophia Williams', 'sophia.williams@example.com', '+15554567', NOW(), NOW()),
('0414e2e5-7f9e-5034-8066-793217eb84c5', 'tenant'::recipient_type, 'Daniel Johnson', 'daniel.johnson@example.com', '+15555678', NOW(), NOW()),
('3dc7f9be-4c50-5a9b-a1c5-0b7f4c929f4f', 'tenant'::recipient_type, 'Olivia Martinez', 'olivia.martinez@example.com', '+15556789', NOW(), NOW()),
('b7df001e-0002-507a-9da9-6ac3c990ba6e', 'tenant'::recipient_type, 'James Wilson', 'james.wilson@example.com', '+15557890', NOW(), NOW()),
('f6e89e70-803d-5763-845c-edf4402dee60', 'tenant'::recipient_type, 'Isabella Anderson', 'isabella.anderson@example.com', '+15558901', NOW(), NOW()),
('510cf5de-eea0-5dda-98b0-4ce9dbbc1d29', 'tenant'::recipient_type, 'Ethan Thomas', 'ethan.thomas@example.com', '+15559012', NOW(), NOW()),
('d6bdc23b-349c-5314-97ec-adaa065ca11b', 'tenant'::recipient_type, 'Ava Taylor', 'ava.taylor@example.com', '+15550123', NOW(), NOW()),
('31e4f9be-37c6-5bbd-89aa-747f5db47268', 'tenant'::recipient_type, 'Sebastian Russo', 'sebasruse03@gmail.com', '+15256856658', NOW(), NOW()),
('fbb4dc23-6e4a-5ee1-9919-e805f4ded107', 'vendor'::recipient_type, 'QuickFix Locksmith', 'quickfixdispatch@gmail.com', '+14155552673', NOW(), NOW()),
('c6566547-c23f-5fdf-9059-f8af17368cd6', 'vendor'::recipient_type, 'AquaFlow Plumbing', 'flowaquasupport@gmail.com', '+14155552673', NOW(), NOW()),
('1826caf4-711c-5f17-b943-9bfb98f9b80d', 'vendor'::recipient_type, 'VoltPro Electrical Services', 'voltprocontact@gmail.com', '+14155552673', NOW(), NOW()),
('2e72d98f-663c-5729-bdc4-97dd5d3fe122', 'vendor'::recipient_type, 'ArcticAir HVAC Solutions Co.', 'arcticservice@gmail.com', '+14155552673', NOW(), NOW()),
('8c391a97-0118-5638-908d-a21a16c72732', 'vendor'::recipient_type, 'HandyHero Maintenance', 'handyhelp@gmail.com', '+14155552673', NOW(), NOW()),
('224f93f2-1b5f-5369-88f9-15fd12024616', 'vendor'::recipient_type, 'RapidGlass & Door Repair', 'rapidglassdispatch@gmail.com', '+14155552673', NOW(), NOW()),
('1463aaa1-c326-5eb8-aae4-c2a1ce29b368', 'vendor'::recipient_type, 'Safe Pest Control', 'Safesupport@gmail.com', '+14155552673', NOW(), NOW()),
('1b583821-f90d-5e5e-aa8d-e31039c66a9f', 'vendor'::recipient_type, 'ClearFlow Drain Services', 'clearflowservice@gmail.com', '+14155552673', NOW(), NOW()),
('e510e1ea-be40-5246-835b-f9482ec29999', 'vendor'::recipient_type, 'BrightSpark Appliance Repair', 'brightsparkrepair@gmail.com', '+14155552673', NOW(), NOW()),
('090f9c13-33df-5899-b3ff-c9f0617f0816', 'vendor'::recipient_type, 'SecureAccess Systems', 'SecureAccessSupport@gmail.com', '+14155552673', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    type = EXCLUDED.type,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- Insert Owners
INSERT INTO owners (id, created_at) VALUES
('943c73d1-ceda-5578-abb0-db914d931f46', NOW()),
('078b51eb-4966-5e7f-8eae-d5151b79032e', NOW()),
('2089cded-11ce-5f91-99ed-df5af744494f', NOW()),
('20616874-23e7-57f1-a558-b935495d6d5b', NOW()),
('ed84c333-2c85-5ae5-9916-60f4d6c9921b', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Property Managers
INSERT INTO property_managers (id, created_at) VALUES
('ab7a3be3-4950-50b1-a1b6-6783aa7a4725', NOW()),
('2fa6c4e0-be26-5f52-bd7f-286d7dd34b80', NOW()),
('128b8f0f-5f80-5ded-a75d-06936e394c51', NOW()),
('197fb109-9e81-5753-a647-a71bdff88efd', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert Vendors
INSERT INTO vendors (id, emergency_available, created_at) VALUES
('fbb4dc23-6e4a-5ee1-9919-e805f4ded107', true, NOW()),
('c6566547-c23f-5fdf-9059-f8af17368cd6', true, NOW()),
('1826caf4-711c-5f17-b943-9bfb98f9b80d', true, NOW()),
('2e72d98f-663c-5729-bdc4-97dd5d3fe122', true, NOW()),
('8c391a97-0118-5638-908d-a21a16c72732', false, NOW()),
('224f93f2-1b5f-5369-88f9-15fd12024616', true, NOW()),
('1463aaa1-c326-5eb8-aae4-c2a1ce29b368', false, NOW()),
('1b583821-f90d-5e5e-aa8d-e31039c66a9f', true, NOW()),
('e510e1ea-be40-5246-835b-f9482ec29999', false, NOW()),
('090f9c13-33df-5899-b3ff-c9f0617f0816', true, NOW())
ON CONFLICT (id) DO UPDATE SET emergency_available = EXCLUDED.emergency_available;

-- Insert Properties
INSERT INTO properties (id, name, address, year_built, property_type, unit_count, created_at, updated_at) VALUES
('7c76dd08-6949-55f2-a211-9d7a342b8a7d', 'Sunset Apartment', 'Spandauer Damm 10-22, 14059 Berlin, Germany', 2026, 'apartment_building'::property_type, 21, NOW(), NOW()),
('401c94a1-6f14-52ac-a9bb-cfa4b2f60c34', 'Riverbend Residences', 'Hardenbergpl. 8, 10787 Berlin, Germany', 2005, 'apartment_building'::property_type, 36, NOW(), NOW()),
('e9ef9ad0-0c28-5c81-aeb7-d5089542b6af', 'Maple Heights', 'Pariser Platz, 10117 Berlin, Germany', 2010, 'apartment_building'::property_type, 18, NOW(), NOW()),
('202f36cc-9314-5de1-9ac8-ac84408c4a62', 'Willow Creek Lofts', 'Prenzlauer Allee 80, 10405 Berlin, Germany', 2015, 'loft_building'::property_type, 12, NOW(), NOW()),
('3f5a13f0-ca00-5a91-aabd-33cdecf388e2', 'Poplar Gardens', 'Osloer Str. 12, 13359 Berlin, Germany', 2020, 'modern_apartment_complex'::property_type, 42, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    year_built = EXCLUDED.year_built,
    property_type = EXCLUDED.property_type,
    unit_count = EXCLUDED.unit_count,
    updated_at = NOW();

-- Insert Units
INSERT INTO units (id, property_id, unit_number, created_at, updated_at) VALUES
('564865d0-0aa6-5f43-8d66-d0446ee6c0e7', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', '4B', NOW(), NOW()),
('78c5cb90-56fb-552e-8f8c-fd81fe924216', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', '2A', NOW(), NOW()),
('5508662f-3869-5d7e-80fe-5a179982fd8a', '401c94a1-6f14-52ac-a9bb-cfa4b2f60c34', '10C', NOW(), NOW()),
('d651cdcc-bae9-51ca-8033-402d2f6f4f4c', '401c94a1-6f14-52ac-a9bb-cfa4b2f60c34', '5B', NOW(), NOW()),
('426cdfe8-ac80-561f-8b6c-2ef668c870f9', 'e9ef9ad0-0c28-5c81-aeb7-d5089542b6af', '3D', NOW(), NOW()),
('47d709ef-5879-5469-97eb-728a09e4722e', '202f36cc-9314-5de1-9ac8-ac84408c4a62', '7A', NOW(), NOW()),
('7a165a73-34bb-5a6d-b1b7-0a5363fdd9be', '202f36cc-9314-5de1-9ac8-ac84408c4a62', '1F', NOW(), NOW()),
('b48e9bec-6932-5f4f-93cd-e4fc176039ca', '202f36cc-9314-5de1-9ac8-ac84408c4a62', '8B', NOW(), NOW()),
('6153ee96-f38c-563f-8700-9119e209a6cb', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', '6C', NOW(), NOW()),
('a1f87a39-7199-5666-a773-37fafb16d0b7', '3f5a13f0-ca00-5a91-aabd-33cdecf388e2', '4D', NOW(), NOW()),
('67833952-4263-5c06-827b-1adfb6b5a75f', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', '5H', NOW(), NOW())
ON CONFLICT (property_id, unit_number) DO UPDATE SET updated_at = NOW();

-- Insert Owner-Property Relationships
INSERT INTO owner_properties (owner_id, property_id) VALUES
('943c73d1-ceda-5578-abb0-db914d931f46', '7c76dd08-6949-55f2-a211-9d7a342b8a7d'),
('078b51eb-4966-5e7f-8eae-d5151b79032e', '401c94a1-6f14-52ac-a9bb-cfa4b2f60c34'),
('2089cded-11ce-5f91-99ed-df5af744494f', 'e9ef9ad0-0c28-5c81-aeb7-d5089542b6af'),
('20616874-23e7-57f1-a558-b935495d6d5b', '202f36cc-9314-5de1-9ac8-ac84408c4a62'),
('ed84c333-2c85-5ae5-9916-60f4d6c9921b', '3f5a13f0-ca00-5a91-aabd-33cdecf388e2')
ON CONFLICT (owner_id, property_id) DO NOTHING;

-- Insert Manager-Property Relationships
INSERT INTO manager_properties (manager_id, property_id) VALUES
('ab7a3be3-4950-50b1-a1b6-6783aa7a4725', '7c76dd08-6949-55f2-a211-9d7a342b8a7d'),
('2fa6c4e0-be26-5f52-bd7f-286d7dd34b80', '401c94a1-6f14-52ac-a9bb-cfa4b2f60c34'),
('128b8f0f-5f80-5ded-a75d-06936e394c51', 'e9ef9ad0-0c28-5c81-aeb7-d5089542b6af'),
('197fb109-9e81-5753-a647-a71bdff88efd', '202f36cc-9314-5de1-9ac8-ac84408c4a62')
ON CONFLICT (manager_id, property_id) DO NOTHING;

-- Insert Tenants
INSERT INTO tenants (id, unit_id, created_at, updated_at) VALUES
('b1c4a072-618b-53a2-a16e-d2387c1efa14', '564865d0-0aa6-5f43-8d66-d0446ee6c0e7', NOW(), NOW()),
('63d3338d-9a5c-5fd2-a51b-d99483e9b25e', '78c5cb90-56fb-552e-8f8c-fd81fe924216', NOW(), NOW()),
('7b668b94-8223-5104-9e69-3d210db1bddb', '5508662f-3869-5d7e-80fe-5a179982fd8a', NOW(), NOW()),
('5803e546-c51d-50b5-965a-862e45879d09', 'd651cdcc-bae9-51ca-8033-402d2f6f4f4c', NOW(), NOW()),
('0414e2e5-7f9e-5034-8066-793217eb84c5', '426cdfe8-ac80-561f-8b6c-2ef668c870f9', NOW(), NOW()),
('3dc7f9be-4c50-5a9b-a1c5-0b7f4c929f4f', '47d709ef-5879-5469-97eb-728a09e4722e', NOW(), NOW()),
('b7df001e-0002-507a-9da9-6ac3c990ba6e', '7a165a73-34bb-5a6d-b1b7-0a5363fdd9be', NOW(), NOW()),
('f6e89e70-803d-5763-845c-edf4402dee60', 'b48e9bec-6932-5f4f-93cd-e4fc176039ca', NOW(), NOW()),
('510cf5de-eea0-5dda-98b0-4ce9dbbc1d29', '6153ee96-f38c-563f-8700-9119e209a6cb', NOW(), NOW()),
('d6bdc23b-349c-5314-97ec-adaa065ca11b', 'a1f87a39-7199-5666-a773-37fafb16d0b7', NOW(), NOW()),
('31e4f9be-37c6-5bbd-89aa-747f5db47268', '67833952-4263-5c06-827b-1adfb6b5a75f', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    unit_id = EXCLUDED.unit_id,
    updated_at = NOW();

-- Insert Vendor Services
INSERT INTO vendor_services (vendor_id, service_name) VALUES
('fbb4dc23-6e4a-5ee1-9919-e805f4ded107', 'locksmith'),
('fbb4dc23-6e4a-5ee1-9919-e805f4ded107', 'door_repair'),
('c6566547-c23f-5fdf-9059-f8af17368cd6', 'plumbing'),
('1826caf4-711c-5f17-b943-9bfb98f9b80d', 'electrical'),
('2e72d98f-663c-5729-bdc4-97dd5d3fe122', 'hvac'),
('8c391a97-0118-5638-908d-a21a16c72732', 'handyman'),
('8c391a97-0118-5638-908d-a21a16c72732', 'general_repair'),
('224f93f2-1b5f-5369-88f9-15fd12024616', 'glass_repair'),
('224f93f2-1b5f-5369-88f9-15fd12024616', 'door_repair'),
('224f93f2-1b5f-5369-88f9-15fd12024616', 'locksmith'),
('1463aaa1-c326-5eb8-aae4-c2a1ce29b368', 'pest_control'),
('1b583821-f90d-5e5e-aa8d-e31039c66a9f', 'drain_cleaning'),
('1b583821-f90d-5e5e-aa8d-e31039c66a9f', 'plumbing'),
('e510e1ea-be40-5246-835b-f9482ec29999', 'appliance_repair'),
('090f9c13-33df-5899-b3ff-c9f0617f0816', 'access_control'),
('090f9c13-33df-5899-b3ff-c9f0617f0816', 'security_systems'),
('090f9c13-33df-5899-b3ff-c9f0617f0816', 'locksmith')
ON CONFLICT (vendor_id, service_name) DO NOTHING;

-- Insert Requests
INSERT INTO requests (id, requester_id, property_id, vendor_id, type, description, status, urgency, escalated, sentiment, confidence, notification_pending, summary, resolved_at, resolved_by, resolution_note, created_at, updated_at) VALUES
('120c6930-919d-5495-bc33-c20e069c03b0', 'b1c4a072-618b-53a2-a16e-d2387c1efa14', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', NULL, 'plumbing'::request_type, 'i have an issue with my plumbing', 'resolved'::request_status, 'low'::request_urgency, true, 'neutral', 1, true, 'The tenant is experiencing low water pressure specifically in their shower and has requested that the property manager be notified to arrange a repair. The AI is currently seeking additional clarification on the nature of the issue before escalating the request to the property management team.', '2026-06-06T15:55:09.863676+00:00'::timestamptz, 'ab7a3be3-4950-50b1-a1b6-6783aa7a4725', 'Skill issue lil bro', '2026-06-04T22:59:59.602997+00:00'::timestamptz, '2026-06-06T15:55:09.863676+00:00'::timestamptz),
('f635bdb9-bf83-5f87-aad4-7e03c9146375', 'b1c4a072-618b-53a2-a16e-d2387c1efa14', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', NULL, 'general'::request_type, 'I have an electrical issue, there is no power and i need it for my respiratory system', 'pending'::request_status, 'low'::request_urgency, true, 'neutral', 1, true, 'The tenant reported a total loss of power in their apartment, which is particularly concerning due to their reliance on medical equipment. The issue has been escalated to the property manager as an emergency, and the tenant was advised to seek external medical assistance if necessary.', NULL, NULL, NULL, '2026-06-04T23:42:55.072668+00:00'::timestamptz, '2026-06-04T23:42:55.072668+00:00'::timestamptz),
('150d4621-859b-5b23-8937-8ef8eeed4612', 'b1c4a072-618b-53a2-a16e-d2387c1efa14', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', NULL, 'emergency'::request_type, 'i have an issue, there is a small gas leak i can smell it', 'pending'::request_status, 'high'::request_urgency, true, 'neutral', 1, true, 'The tenant reported a suspected gas leak inside their apartment at Spandauer Damm. The AI instructed the tenant to evacuate the building immediately and contact emergency services, while simultaneously escalating the issue to the property manager as a priority emergency.', NULL, NULL, NULL, '2026-06-06T07:40:23.214913+00:00'::timestamptz, '2026-06-06T07:40:23.214913+00:00'::timestamptz),
('b7d42924-0c76-59cb-a5d3-8ec22b876a32', '7b668b94-8223-5104-9e69-3d210db1bddb', '401c94a1-6f14-52ac-a9bb-cfa4b2f60c34', '2e72d98f-663c-5729-bdc4-97dd5d3fe122', 'hvac'::request_type, 'The heating system is not working and the apartment is very cold.', 'pending'::request_status, 'medium'::request_urgency, true, 'negative', 0.98, false, 'Tenant reported a heating failure isolated to their apartment. The issue was escalated to the property manager and HVAC contractor.', NULL, NULL, NULL, '2026-06-01T08:17:20Z'::timestamptz, '2026-06-01T08:17:20Z'::timestamptz),
('f42d7e74-0782-5895-9217-33ae12a6155a', '5803e546-c51d-50b5-965a-862e45879d09', '401c94a1-6f14-52ac-a9bb-cfa4b2f60c34', '1826caf4-711c-5f17-b943-9bfb98f9b80d', 'electrical'::request_type, 'Half of the outlets in my apartment stopped working.', 'in_progress'::request_status, 'medium'::request_urgency, true, 'neutral', 0.96, false, 'Several electrical outlets stopped functioning despite no visible breaker issue. Escalated to electrical contractor.', NULL, NULL, NULL, '2026-06-02T13:46:30Z'::timestamptz, '2026-06-02T13:46:30Z'::timestamptz),
('d3277eb0-d021-50c4-b2cd-bf229e9175d5', '0414e2e5-7f9e-5034-8066-793217eb84c5', 'e9ef9ad0-0c28-5c81-aeb7-d5089542b6af', '1463aaa1-c326-5eb8-aae4-c2a1ce29b368', 'pest_control'::request_type, 'I have noticed cockroaches in the kitchen for the past week.', 'pending'::request_status, 'low'::request_urgency, true, 'negative', 0.94, true, 'Tenant reported recurring cockroach activity in the kitchen area. Pest control service requested.', NULL, NULL, NULL, '2026-06-03T10:11:30Z'::timestamptz, '2026-06-03T10:11:30Z'::timestamptz),
('51ad8c00-3497-57e6-b239-a20d1059d2e0', '3dc7f9be-4c50-5a9b-a1c5-0b7f4c929f4f', '202f36cc-9314-5de1-9ac8-ac84408c4a62', 'fbb4dc23-6e4a-5ee1-9919-e805f4ded107', 'lockout'::request_type, 'My apartment key broke inside the lock.', 'in_progress'::request_status, 'high'::request_urgency, true, 'negative', 1, false, 'Tenant is locked out after a key snapped inside the lock. Emergency locksmith dispatched.', NULL, NULL, NULL, '2026-06-04T18:00:40Z'::timestamptz, '2026-06-04T18:00:40Z'::timestamptz),
('7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', 'b7df001e-0002-507a-9da9-6ac3c990ba6e', '202f36cc-9314-5de1-9ac8-ac84408c4a62', '224f93f2-1b5f-5369-88f9-15fd12024616', 'general'::request_type, 'Bedroom window cracked after a storm.', 'pending'::request_status, 'medium'::request_urgency, true, 'neutral', 0.95, true, 'Tenant reported a cracked bedroom window that may worsen. Glass repair vendor recommended.', NULL, NULL, NULL, '2026-06-05T09:31:10Z'::timestamptz, '2026-06-05T09:31:10Z'::timestamptz),
('91c09665-7f79-5ce6-b5bd-b4f3b9521da3', 'f6e89e70-803d-5763-845c-edf4402dee60', '202f36cc-9314-5de1-9ac8-ac84408c4a62', 'e510e1ea-be40-5246-835b-f9482ec29999', 'appliance'::request_type, 'The refrigerator is not cooling properly.', 'pending'::request_status, 'medium'::request_urgency, true, 'neutral', 0.97, true, 'Refrigerator compartment has lost cooling while freezer remains operational. Appliance repair requested.', NULL, NULL, NULL, '2026-06-05T16:16:20Z'::timestamptz, '2026-06-05T16:16:20Z'::timestamptz),
('c3734d16-675e-5dff-85f5-265ed8522bc9', 'd6bdc23b-349c-5314-97ec-adaa065ca11b', '3f5a13f0-ca00-5a91-aabd-33cdecf388e2', '1b583821-f90d-5e5e-aa8d-e31039c66a9f', 'plumbing'::request_type, 'Kitchen sink drain is completely clogged.', 'in_progress'::request_status, 'medium'::request_urgency, true, 'negative', 0.99, false, 'Tenant reported a fully blocked kitchen sink drain. Drain cleaning vendor assigned.', NULL, NULL, NULL, '2026-06-05T12:01:00Z'::timestamptz, '2026-06-05T12:01:00Z'::timestamptz),
('785b41e2-f04e-5baa-8221-a67f7f88c46e', 'd6bdc23b-349c-5314-97ec-adaa065ca11b', '3f5a13f0-ca00-5a91-aabd-33cdecf388e2', '090f9c13-33df-5899-b3ff-c9f0617f0816', 'access_control'::request_type, 'The main building entrance access keypad is malfunctioning.', 'pending'::request_status, 'high'::request_urgency, true, 'neutral', 0.98, false, 'Multiple residents are unable to use the building access keypad. Security systems vendor assigned for urgent review.', NULL, NULL, NULL, '2026-06-06T06:21:15Z'::timestamptz, '2026-06-06T06:21:15Z'::timestamptz),
('705aa687-9ba1-5234-902b-2310d1c4a020', 'b1c4a072-618b-53a2-a16e-d2387c1efa14', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', NULL, 'electrical'::request_type, 'I have a problem with the electricity in my apartment, please send an email to the manager my apartment', 'pending'::request_status, 'high'::request_urgency, true, 'neutral', 1, true, 'John Tenant is experiencing a recurring electrical short circuit in his apartment that causes the breaker to trip whenever appliances are plugged in. The AI coordinator has advised him to stop using the affected outlets for safety and has escalated the issue to the property manager to arrange for a professional electrician.', NULL, NULL, NULL, '2026-06-06T09:16:17.784323+00:00'::timestamptz, '2026-06-06T09:16:17.784323+00:00'::timestamptz),
('645f7295-3a7c-5deb-a037-9b5b634bbf45', 'b1c4a072-618b-53a2-a16e-d2387c1efa14', '7c76dd08-6949-55f2-a211-9d7a342b8a7d', NULL, 'emergency'::request_type, 'I have a gas leak', 'resolved'::request_status, 'high'::request_urgency, true, 'neutral', 1, false, 'The tenant reported a gas leak at their apartment building, which is a critical safety hazard. The AI instructed the tenant to evacuate and contact emergency services immediately, and the issue has been escalated to the property manager as an emergency.', '2026-06-06T15:57:18.629779+00:00'::timestamptz, 'ab7a3be3-4950-50b1-a1b6-6783aa7a4725', 'skill issue lil bro', '2026-06-06T11:34:08.680229+00:00'::timestamptz, '2026-06-06T15:57:18.629779+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
    requester_id = EXCLUDED.requester_id,
    property_id = EXCLUDED.property_id,
    vendor_id = EXCLUDED.vendor_id,
    type = EXCLUDED.type,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    urgency = EXCLUDED.urgency,
    escalated = EXCLUDED.escalated,
    sentiment = EXCLUDED.sentiment,
    confidence = EXCLUDED.confidence,
    notification_pending = EXCLUDED.notification_pending,
    summary = EXCLUDED.summary,
    resolved_at = EXCLUDED.resolved_at,
    resolved_by = EXCLUDED.resolved_by,
    resolution_note = EXCLUDED.resolution_note,
    updated_at = EXCLUDED.updated_at;

-- Insert Request Involved Parties
INSERT INTO request_involved_parties (request_id, actor_id) VALUES
('120c6930-919d-5495-bc33-c20e069c03b0', 'b1c4a072-618b-53a2-a16e-d2387c1efa14'),
('f635bdb9-bf83-5f87-aad4-7e03c9146375', 'b1c4a072-618b-53a2-a16e-d2387c1efa14'),
('150d4621-859b-5b23-8937-8ef8eeed4612', 'b1c4a072-618b-53a2-a16e-d2387c1efa14'),
('b7d42924-0c76-59cb-a5d3-8ec22b876a32', '7b668b94-8223-5104-9e69-3d210db1bddb'),
('b7d42924-0c76-59cb-a5d3-8ec22b876a32', '2fa6c4e0-be26-5f52-bd7f-286d7dd34b80'),
('b7d42924-0c76-59cb-a5d3-8ec22b876a32', '2e72d98f-663c-5729-bdc4-97dd5d3fe122'),
('f42d7e74-0782-5895-9217-33ae12a6155a', '5803e546-c51d-50b5-965a-862e45879d09'),
('f42d7e74-0782-5895-9217-33ae12a6155a', '2fa6c4e0-be26-5f52-bd7f-286d7dd34b80'),
('f42d7e74-0782-5895-9217-33ae12a6155a', '1826caf4-711c-5f17-b943-9bfb98f9b80d'),
('d3277eb0-d021-50c4-b2cd-bf229e9175d5', '0414e2e5-7f9e-5034-8066-793217eb84c5'),
('d3277eb0-d021-50c4-b2cd-bf229e9175d5', '128b8f0f-5f80-5ded-a75d-06936e394c51'),
('d3277eb0-d021-50c4-b2cd-bf229e9175d5', '1463aaa1-c326-5eb8-aae4-c2a1ce29b368'),
('51ad8c00-3497-57e6-b239-a20d1059d2e0', '3dc7f9be-4c50-5a9b-a1c5-0b7f4c929f4f'),
('51ad8c00-3497-57e6-b239-a20d1059d2e0', '197fb109-9e81-5753-a647-a71bdff88efd'),
('51ad8c00-3497-57e6-b239-a20d1059d2e0', 'fbb4dc23-6e4a-5ee1-9919-e805f4ded107'),
('7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', 'b7df001e-0002-507a-9da9-6ac3c990ba6e'),
('7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', '197fb109-9e81-5753-a647-a71bdff88efd'),
('7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', '224f93f2-1b5f-5369-88f9-15fd12024616'),
('91c09665-7f79-5ce6-b5bd-b4f3b9521da3', 'f6e89e70-803d-5763-845c-edf4402dee60'),
('91c09665-7f79-5ce6-b5bd-b4f3b9521da3', '197fb109-9e81-5753-a647-a71bdff88efd'),
('91c09665-7f79-5ce6-b5bd-b4f3b9521da3', 'e510e1ea-be40-5246-835b-f9482ec29999'),
('c3734d16-675e-5dff-85f5-265ed8522bc9', 'd6bdc23b-349c-5314-97ec-adaa065ca11b'),
('c3734d16-675e-5dff-85f5-265ed8522bc9', 'ed84c333-2c85-5ae5-9916-60f4d6c9921b'),
('c3734d16-675e-5dff-85f5-265ed8522bc9', '1b583821-f90d-5e5e-aa8d-e31039c66a9f'),
('785b41e2-f04e-5baa-8221-a67f7f88c46e', 'd6bdc23b-349c-5314-97ec-adaa065ca11b'),
('785b41e2-f04e-5baa-8221-a67f7f88c46e', 'ed84c333-2c85-5ae5-9916-60f4d6c9921b'),
('785b41e2-f04e-5baa-8221-a67f7f88c46e', '090f9c13-33df-5899-b3ff-c9f0617f0816'),
('705aa687-9ba1-5234-902b-2310d1c4a020', 'b1c4a072-618b-53a2-a16e-d2387c1efa14'),
('645f7295-3a7c-5deb-a037-9b5b634bbf45', 'b1c4a072-618b-53a2-a16e-d2387c1efa14')
ON CONFLICT (request_id, actor_id) DO NOTHING;

-- Insert Conversation Messages
INSERT INTO conversation_messages (id, request_id, role, message, created_at) VALUES
('b8fa38d3-2ff6-45c4-ab56-6e575189d60f', '120c6930-919d-5495-bc33-c20e069c03b0', 'ai'::message_role, 'Hello John Tenant. We are delighted to have you at Spandauer Damm 10-22, 14059 Berlin, Germany. How can I assist you today?', '2026-06-04T22:55:30.580Z'::timestamptz),
('96a49b32-46ea-4036-ad39-c94eab14bc61', '120c6930-919d-5495-bc33-c20e069c03b0', 'tenant'::message_role, 'i have an issue with my plumbing', '2026-06-04T22:56:44.774Z'::timestamptz),
('6706c91d-2158-4a62-bb2b-17eaa5c13659', '120c6930-919d-5495-bc33-c20e069c03b0', 'ai'::message_role, 'I''m sorry to hear you''re having trouble with your plumbing, John. To help me get the right person to assist you, could you please describe the specific issue? For example, is it a leak, a clogged drain, or a problem with water pressure?', '2026-06-04T22:56:49.467Z'::timestamptz),
('ff11984e-a927-4427-9bd2-5fde70fbdb97', '120c6930-919d-5495-bc33-c20e069c03b0', 'tenant'::message_role, 'its a water pressure problem with my shower head, there is barely enough pressure to take a proper bath', '2026-06-04T22:57:34.981Z'::timestamptz),
('da408874-96f3-4569-ae0f-7e09ec30d750', '120c6930-919d-5495-bc33-c20e069c03b0', 'ai'::message_role, 'I''m sorry to hear you''re having trouble with your shower''s water pressure, John. To help me coordinate the right repair, could you please let me know if this is happening in other faucets throughout your apartment as well, or is it isolated just to the shower?', '2026-06-04T22:57:37.009Z'::timestamptz),
('b5ca17e6-1ea5-474d-bcad-0d9687a1d3a8', '120c6930-919d-5495-bc33-c20e069c03b0', 'tenant'::message_role, 'Isolated to the shower only, can you contact the property manager and relevant party?', '2026-06-04T22:59:09.714Z'::timestamptz),
('74b39ec1-1850-4ef4-8214-8f3f3dd5176f', '120c6930-919d-5495-bc33-c20e069c03b0', 'ai'::message_role, 'I''m sorry to hear you''re having trouble with your shower. To make sure I get the right person out to help, could you please clarify if this is a leak, a clog, or an issue with the water temperature/pressure?

Relevant links:
- Can a property manager tell me not to use my only shower with no ...: https://www.avvo.com/legal-answers/can-a-property-manager-tell-me-not-to-use-my-only--5507640.html - You are entitled to a rent abatement for the period of time you are living without a tub/shower. See if there is a local health club like...
- Is it okay to tell your landlord the shower doesn''t get hot enough, or ...: https://www.quora.com/Is-it-okay-to-tell-your-landlord-the-shower-doesnt-get-hot-enough-or-is-that-not-their-job - However, do not tell him that the shower does not get hot enough. First call and text your property manager. DO NOT TRY TO FIX IT YOUR SE...
- Came home from work this afternoon to find my water randomly shut ...: https://www.reddit.com/r/shitrentals/comments/1i1v87x/came_home_from_work_this_afternoon_to_find_my - Property manager suggests going to the local gym to shower. Water comes under urgent repairs in Vic, which means you are legally able to', '2026-06-04T22:59:15.215Z'::timestamptz),
('b5f3f2f6-5e13-4528-ba12-edf1a6a6a938', 'f635bdb9-bf83-5f87-aad4-7e03c9146375', 'ai'::message_role, 'Hello John Tenant. We are delighted to have you at Spandauer Damm 10-22, 14059 Berlin, Germany. How can I assist you today?', '2026-06-04T23:40:07.898Z'::timestamptz),
('31207110-032d-43c4-a35e-9329190f1673', 'f635bdb9-bf83-5f87-aad4-7e03c9146375', 'tenant'::message_role, 'I have an electrical issue, there is no power and i need it for my respiratory system', '2026-06-04T23:40:41.042Z'::timestamptz),
('cb96fdc8-9288-4a99-9008-482ca5a6d565', 'f635bdb9-bf83-5f87-aad4-7e03c9146375', 'ai'::message_role, 'I am very sorry to hear this, John. Because this involves your medical equipment, this is being treated as an emergency. Please prioritize your safety and seek medical assistance if needed. I have escalated this to the property manager immediately to restore power as a top priority.', '2026-06-04T23:40:42.176Z'::timestamptz),
('a50e99f6-a34c-4e8a-b790-d254fd08055d', 'f635bdb9-bf83-5f87-aad4-7e03c9146375', 'tenant'::message_role, 'provide me with some information on the internet on how to give power to my respiratory system?', '2026-06-04T23:41:31.848Z'::timestamptz),
('13ec70dd-54b2-4a2b-86ce-9c9ea07313e4', 'f635bdb9-bf83-5f87-aad4-7e03c9146375', 'ai'::message_role, 'I''m sorry, but I''m not sure I understand your request. As a property operations coordinator for Ranting Chant, I am here to assist with maintenance, lease, or building-related issues at your apartment. If you are experiencing a medical emergency, please contact local emergency services immediately. Otherwise, could you please clarify how I can help you with your property?

Relevant links:
- Respiratory System: Organs, Facts, Anatomy & Function: https://my.clevelandclinic.org/health/body/21205-respiratory-system - # Respiratory System. Your respiratory system is made up of your lungs, airways (trachea, bronchi and bronchioles), diaphragm, voice box,...
- How We Breathe - Craig Hospital: https://craighospital.org/resources/how-we-breathe - The role of the respiratory system is to breathe in oxygen and breathe out carbon dioxide. This is known as respiration.
- How the Lungs Work - The Respiratory System | NHLBI, NIH: https://www.nhlbi.nih.gov/health/lungs/respiratory-system - An official website of the United States government. A **.gov** website belongs to an official government organization in the United Stat...', '2026-06-04T23:41:35.689Z'::timestamptz),
('7e57e3e9-89ac-4d4b-ac99-4bf99f593dfd', '150d4621-859b-5b23-8937-8ef8eeed4612', 'ai'::message_role, 'Hello John Tenant. We are delighted to have you at Spandauer Damm 10-22, 14059 Berlin, Germany. How can I assist you today?', '2026-06-06T07:38:32.026Z'::timestamptz),
('5bd7a87d-52e1-4446-87d2-23b74edfea14', '150d4621-859b-5b23-8937-8ef8eeed4612', 'tenant'::message_role, 'i have an issue, there is a small gas leak i can smell it', '2026-06-06T07:40:12.570Z'::timestamptz),
('3bc16980-4ba2-4207-b8e2-94b1cedc7992', '150d4621-859b-5b23-8937-8ef8eeed4612', 'ai'::message_role, 'I am very concerned to hear about a gas leak. Please evacuate the premises immediately, leave the door unlocked, and call local emergency services (112 in Germany) from a safe location outside. Do not use any light switches or electrical devices. I have escalated this to your property manager as an emergency.', '2026-06-06T07:40:18.283Z'::timestamptz),
('4968c3d5-996d-5684-8a7c-ff077ab01550', 'b7d42924-0c76-59cb-a5d3-8ec22b876a32', 'ai'::message_role, 'Hello Michael Brown. How can I assist you today?', '2026-06-01T08:15:00Z'::timestamptz),
('4ef53a91-b2fa-57f0-a071-9ebf24cbecdc', 'b7d42924-0c76-59cb-a5d3-8ec22b876a32', 'tenant'::message_role, 'The heating system is not working and the apartment is very cold.', '2026-06-01T08:16:10Z'::timestamptz),
('fb26e786-c6c5-5a0b-84bb-0b5fcc9a5966', 'b7d42924-0c76-59cb-a5d3-8ec22b876a32', 'ai'::message_role, 'I''m sorry to hear that. Has the thermostat been adjusted recently, and are other residents experiencing similar issues?', '2026-06-01T08:16:35Z'::timestamptz),
('787dc444-8b53-5b05-a83e-6a48a49002d6', 'b7d42924-0c76-59cb-a5d3-8ec22b876a32', 'tenant'::message_role, 'My neighbors say theirs is working fine.', '2026-06-01T08:17:01Z'::timestamptz),
('08e25442-fda3-5ac4-a0a1-cbd1588a0bf3', 'b7d42924-0c76-59cb-a5d3-8ec22b876a32', 'ai'::message_role, 'Thank you. I have escalated this issue to the property manager and assigned an HVAC vendor for inspection.', '2026-06-01T08:17:20Z'::timestamptz),
('b6c9976d-7f30-5164-ab38-775b5c5ad823', 'f42d7e74-0782-5895-9217-33ae12a6155a', 'tenant'::message_role, 'Half of the outlets in my apartment stopped working.', '2026-06-02T13:45:00Z'::timestamptz),
('87488e53-0d71-5c54-8ff4-d1f7ca695590', 'f42d7e74-0782-5895-9217-33ae12a6155a', 'ai'::message_role, 'Have you checked the circuit breaker panel for any tripped breakers?', '2026-06-02T13:45:25Z'::timestamptz),
('8a7000ec-5eaa-506d-aa51-f1455002788a', 'f42d7e74-0782-5895-9217-33ae12a6155a', 'tenant'::message_role, 'Yes, everything appears normal.', '2026-06-02T13:46:02Z'::timestamptz),
('cb650645-e26b-5458-ba81-450bd530dd05', 'f42d7e74-0782-5895-9217-33ae12a6155a', 'ai'::message_role, 'Thank you. An electrician has been notified and the property manager has been informed.', '2026-06-02T13:46:30Z'::timestamptz),
('229ee4c5-0ed8-5b8e-92c5-79d15eadc1df', 'd3277eb0-d021-50c4-b2cd-bf229e9175d5', 'tenant'::message_role, 'I have noticed cockroaches in the kitchen for the past week.', '2026-06-03T10:10:00Z'::timestamptz),
('c1bc7b27-2889-5f07-809f-69e60854cf55', 'd3277eb0-d021-50c4-b2cd-bf229e9175d5', 'ai'::message_role, 'Thank you for reporting this. Approximately how many have you seen and at what times?', '2026-06-03T10:10:30Z'::timestamptz),
('a1278186-99f6-5b96-ba5a-17781841c008', 'd3277eb0-d021-50c4-b2cd-bf229e9175d5', 'tenant'::message_role, 'Usually a few at night around the sink.', '2026-06-03T10:11:11Z'::timestamptz),
('932b93fc-a2e4-5be3-ad5c-c0dc86b2b50c', '51ad8c00-3497-57e6-b239-a20d1059d2e0', 'tenant'::message_role, 'My apartment key broke inside the lock and I cannot enter.', '2026-06-04T18:00:00Z'::timestamptz),
('6bad9043-411e-51d8-b5f6-174dbb77a4d6', '51ad8c00-3497-57e6-b239-a20d1059d2e0', 'ai'::message_role, 'Are you currently locked out of your apartment?', '2026-06-04T18:00:14Z'::timestamptz),
('7954d4c0-233e-570e-a434-6cca530728d1', '51ad8c00-3497-57e6-b239-a20d1059d2e0', 'tenant'::message_role, 'Yes.', '2026-06-04T18:00:25Z'::timestamptz),
('5445b23d-9b6a-5b9e-a19f-693579be377a', '51ad8c00-3497-57e6-b239-a20d1059d2e0', 'ai'::message_role, 'This has been escalated as an urgent access issue and a locksmith has been contacted.', '2026-06-04T18:00:40Z'::timestamptz),
('afcafced-aaeb-5d8f-9541-df39f3eb5e15', '7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', 'tenant'::message_role, 'My bedroom window cracked after yesterday''s storm.', '2026-06-05T09:30:00Z'::timestamptz),
('48d869c1-4489-5de2-9ebf-d2b0e53c2e31', '7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', 'ai'::message_role, 'Thank you for reporting this. Is the glass intact or are there loose shards present?', '2026-06-05T09:30:18Z'::timestamptz),
('263b9f7f-aed3-5549-9e08-d865b86729da', '7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', 'tenant'::message_role, 'The glass is still intact but the crack is spreading.', '2026-06-05T09:31:00Z'::timestamptz),
('6f6a613d-6d8e-5aea-85d1-38bc81863304', '91c09665-7f79-5ce6-b5bd-b4f3b9521da3', 'tenant'::message_role, 'The refrigerator is not cooling properly.', '2026-06-05T16:15:00Z'::timestamptz),
('8393ee84-39f1-5e17-93c5-096809e85e33', '91c09665-7f79-5ce6-b5bd-b4f3b9521da3', 'ai'::message_role, 'Are both the refrigerator and freezer compartments affected?', '2026-06-05T16:15:21Z'::timestamptz),
('4e046a9d-ef8a-59ff-8ec7-8b448bb7151d', '91c09665-7f79-5ce6-b5bd-b4f3b9521da3', 'tenant'::message_role, 'The freezer still works but the refrigerator section is warm.', '2026-06-05T16:16:00Z'::timestamptz),
('e464a0e4-a39e-5f08-98d5-bc6610d010e4', 'c3734d16-675e-5dff-85f5-265ed8522bc9', 'tenant'::message_role, 'The kitchen sink drain is completely clogged.', '2026-06-05T12:00:00Z'::timestamptz),
('9a152cc4-f834-5be3-9281-07b96b3907dd', 'c3734d16-675e-5dff-85f5-265ed8522bc9', 'ai'::message_role, 'Is any water draining at all or is it completely blocked?', '2026-06-05T12:00:15Z'::timestamptz),
('f4cdbded-8e30-5412-bcd0-1cbff9269198', 'c3734d16-675e-5dff-85f5-265ed8522bc9', 'tenant'::message_role, 'No water is draining.', '2026-06-05T12:00:45Z'::timestamptz),
('b0aaebae-472a-5287-a52d-9b333a865bbc', '785b41e2-f04e-5baa-8221-a67f7f88c46e', 'tenant'::message_role, 'The entrance keypad is not unlocking the main door.', '2026-06-06T06:20:00Z'::timestamptz),
('489482b8-8265-52ef-a437-e992b8a65754', '785b41e2-f04e-5baa-8221-a67f7f88c46e', 'ai'::message_role, 'Are all residents affected or only your access code?', '2026-06-06T06:20:22Z'::timestamptz),
('4d4684a8-7ad8-5d24-868c-e697f636cfe1', '785b41e2-f04e-5baa-8221-a67f7f88c46e', 'tenant'::message_role, 'Several residents are having the same issue.', '2026-06-06T06:21:00Z'::timestamptz),
('7bcaed4b-cbdc-57fe-9216-7b6a7602fe8e', '785b41e2-f04e-5baa-8221-a67f7f88c46e', 'ai'::message_role, 'Thank you. This has been escalated as a building access issue and the owner has been notified.', '2026-06-06T06:21:15Z'::timestamptz),
('be2d5bb2-6dae-4475-82cd-3dfd4b82bbce', '705aa687-9ba1-5234-902b-2310d1c4a020', 'ai'::message_role, 'Hello John Tenant. We are delighted to have you at Spandauer Damm 10-22, 14059 Berlin, Germany. How can I assist you today?', '2026-06-06T09:13:18.670Z'::timestamptz),
('f63eaf13-8d0f-49e7-a941-c6e7e9960713', '705aa687-9ba1-5234-902b-2310d1c4a020', 'tenant'::message_role, 'I have a problem with the electricity in my apartment, please send an email to the manager my apartment', '2026-06-06T09:13:54.793Z'::timestamptz),
('fdb8bce6-3208-41ed-9417-2826b0babdda', '705aa687-9ba1-5234-902b-2310d1c4a020', 'ai'::message_role, 'I''m sorry to hear you''re having electrical issues, John. To make sure I get the right help to you, could you please clarify if you have a total power loss, or if it''s just specific outlets or lights that aren''t working? Also, are you currently safe?

Relevant links:
- I have an electrical problem in my apartment that my electric would ...: https://www.quora.com/I-have-an-electrical-problem-in-my-apartment-that-my-electric-would-shut-off-starting-mid-afternoon-all-thru-the-night-and-my-landlord-won-t-do-anything-about-it-What-can-I-do-to-get-it-taken-seriously-and-fix-it - Learn where the apartment breakers are, and reset them yourself. Or call an electrician, and bill the landlord- in some cases, having
- Power Outage Email Templates - TextExpander: https://textexpander.com/templates/energy-power-outage-email - This article presents a series of unique power outage email templates designed to help you effectively communicate during such disruptions.
- The 7 Most Common Calls for Electrical Repairs in Apartments: https://gladiatorelectric.com/electrical-repairs-apartments - From faulty wiring in older units to frequent breaker trips, outlet failures, lighting problems in shared spaces, and power surges that d...', '2026-06-06T09:14:02.530Z'::timestamptz),
('de3dda66-11f7-45d7-9671-45f00649a45e', '705aa687-9ba1-5234-902b-2310d1c4a020', 'tenant'::message_role, 'the breaker keeps turningn off a portion of the house, even when i put it back on, as soon as i connect something it shorts and turns off right away, there must be something shorting off and making the mechanical safety feature engage, please send an email to my manager', '2026-06-06T09:15:44.741Z'::timestamptz),
('0bf93520-3411-4ae8-893d-45953e6d79b6', '705aa687-9ba1-5234-902b-2310d1c4a020', 'ai'::message_role, 'I am very sorry to hear about this electrical issue, John. Since the breaker is tripping immediately upon use, this indicates a potential short circuit which poses a fire risk. Please keep that circuit turned off and avoid plugging anything into those outlets until a professional can inspect it. I am escalating this to your property manager immediately to ensure an electrician is dispatched as soon as possible.', '2026-06-06T09:15:54.105Z'::timestamptz),
('5405b76b-142c-42c9-af54-4da9817d9edc', '645f7295-3a7c-5deb-a037-9b5b634bbf45', 'ai'::message_role, 'Hello John Tenant. We are delighted to have you at Spandauer Damm 10-22, 14059 Berlin, Germany. How can I assist you today?', '2026-06-06T11:32:35.498Z'::timestamptz),
('c38b2f3a-601c-40b7-ba9a-2771941a6b6a', '645f7295-3a7c-5deb-a037-9b5b634bbf45', 'tenant'::message_role, 'I have a gas leak', '2026-06-06T11:32:43.842Z'::timestamptz),
('43cfc1b7-742c-4e68-a681-a92b5e971eed', '645f7295-3a7c-5deb-a037-9b5b634bbf45', 'ai'::message_role, 'I am very sorry to hear this. Please evacuate the building immediately and move to a safe location. Do not use any light switches, electronics, or open flames. Once you are in a safe place, please call the local emergency services (112 in Germany) and your gas provider immediately. I have escalated this to your property manager as an emergency.', '2026-06-06T11:33:01.192Z'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
    request_id = EXCLUDED.request_id,
    role = EXCLUDED.role,
    message = EXCLUDED.message,
    created_at = EXCLUDED.created_at;

-- Insert Notifications
INSERT INTO notifications (id, request_id, type, recipient_actor_id, recipient_type, status, created_at) VALUES
('723a23b2-24b5-5ab6-88a1-0389edcce173', '120c6930-919d-5495-bc33-c20e069c03b0', 'email'::notification_type, 'ab7a3be3-4950-50b1-a1b6-6783aa7a4725', 'manager'::recipient_type, 'sent'::notification_status, '2026-06-04T22:59:59.602997+00:00'::timestamptz),
('3b4fa388-32f7-5171-8152-89d63106723d', 'b7d42924-0c76-59cb-a5d3-8ec22b876a32', 'email'::notification_type, '2fa6c4e0-be26-5f52-bd7f-286d7dd34b80', 'manager'::recipient_type, 'sent'::notification_status, '2026-06-01T08:17:20Z'::timestamptz),
('ea2e28d5-b56a-57a0-a355-96a71d66f534', 'b7d42924-0c76-59cb-a5d3-8ec22b876a32', 'email'::notification_type, '2e72d98f-663c-5729-bdc4-97dd5d3fe122', 'vendor'::recipient_type, 'sent'::notification_status, '2026-06-01T08:17:20Z'::timestamptz),
('e4db0367-9510-51ad-b14f-89e988188c39', 'f42d7e74-0782-5895-9217-33ae12a6155a', 'email'::notification_type, '2fa6c4e0-be26-5f52-bd7f-286d7dd34b80', 'manager'::recipient_type, 'sent'::notification_status, '2026-06-02T13:46:30Z'::timestamptz),
('b6bdfe80-2068-5bf8-9b73-1d78203d6504', 'f42d7e74-0782-5895-9217-33ae12a6155a', 'email'::notification_type, '1826caf4-711c-5f17-b943-9bfb98f9b80d', 'vendor'::recipient_type, 'sent'::notification_status, '2026-06-02T13:46:30Z'::timestamptz),
('057f8787-befe-5182-8b40-b376653fc652', 'd3277eb0-d021-50c4-b2cd-bf229e9175d5', 'email'::notification_type, '128b8f0f-5f80-5ded-a75d-06936e394c51', 'manager'::recipient_type, 'sent'::notification_status, '2026-06-03T10:11:30Z'::timestamptz),
('88af81fe-c9c3-5003-9fc3-2cfc7a63bf57', '51ad8c00-3497-57e6-b239-a20d1059d2e0', 'email'::notification_type, '197fb109-9e81-5753-a647-a71bdff88efd', 'manager'::recipient_type, 'sent'::notification_status, '2026-06-04T18:00:40Z'::timestamptz),
('5b0b3689-503b-59bf-ac5e-c36d5d8cb4c9', '51ad8c00-3497-57e6-b239-a20d1059d2e0', 'email'::notification_type, 'fbb4dc23-6e4a-5ee1-9919-e805f4ded107', 'vendor'::recipient_type, 'sent'::notification_status, '2026-06-04T18:00:40Z'::timestamptz),
('8a064a2a-6e86-5f30-a907-754a1febfb96', '7bf4f762-48b6-5ce1-a962-e7b6b2e6a0c3', 'email'::notification_type, '197fb109-9e81-5753-a647-a71bdff88efd', 'manager'::recipient_type, 'sent'::notification_status, '2026-06-05T09:31:10Z'::timestamptz),
('637e902b-5681-5ddb-a91a-cb1b6978cea2', '91c09665-7f79-5ce6-b5bd-b4f3b9521da3', 'email'::notification_type, '197fb109-9e81-5753-a647-a71bdff88efd', 'manager'::recipient_type, 'sent'::notification_status, '2026-06-05T16:16:20Z'::timestamptz),
('f92cac26-7944-570d-90da-5be120246b1d', 'c3734d16-675e-5dff-85f5-265ed8522bc9', 'email'::notification_type, 'ed84c333-2c85-5ae5-9916-60f4d6c9921b', 'owner'::recipient_type, 'sent'::notification_status, '2026-06-05T12:01:00Z'::timestamptz),
('b85d3ecc-eb04-5df4-aaa8-017f21e51f3e', 'c3734d16-675e-5dff-85f5-265ed8522bc9', 'email'::notification_type, '1b583821-f90d-5e5e-aa8d-e31039c66a9f', 'vendor'::recipient_type, 'sent'::notification_status, '2026-06-05T12:01:00Z'::timestamptz),
('dc57f769-1ed1-5981-873c-6e7a28f45424', '785b41e2-f04e-5baa-8221-a67f7f88c46e', 'email'::notification_type, 'ed84c333-2c85-5ae5-9916-60f4d6c9921b', 'owner'::recipient_type, 'sent'::notification_status, '2026-06-06T06:21:15Z'::timestamptz),
('39bf7d69-b86e-570f-9c5d-409bc3d45396', '785b41e2-f04e-5baa-8221-a67f7f88c46e', 'email'::notification_type, '090f9c13-33df-5899-b3ff-c9f0617f0816', 'vendor'::recipient_type, 'sent'::notification_status, '2026-06-06T06:21:15Z'::timestamptz),
('6ed6f89a-ea9d-53d8-93d1-29252b3a83af', '645f7295-3a7c-5deb-a037-9b5b634bbf45', 'email'::notification_type, 'ab7a3be3-4950-50b1-a1b6-6783aa7a4725', 'manager'::recipient_type, 'failed'::notification_status, '2026-06-06T11:34:13.796886+00:00'::timestamptz),
('bd22505e-065a-56f9-833e-a788c578c40b', '645f7295-3a7c-5deb-a037-9b5b634bbf45', 'sms'::notification_type, 'ab7a3be3-4950-50b1-a1b6-6783aa7a4725', 'manager'::recipient_type, 'failed'::notification_status, '2026-06-06T11:34:13.796886+00:00'::timestamptz)
ON CONFLICT (id) DO UPDATE SET
    request_id = EXCLUDED.request_id,
    type = EXCLUDED.type,
    recipient_actor_id = EXCLUDED.recipient_actor_id,
    recipient_type = EXCLUDED.recipient_type,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;

COMMIT;
