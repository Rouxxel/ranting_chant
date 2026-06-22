-- User Accounts Mapping Migration Script
--
-- This script maps Supabase Auth users to owner/manager actors.
--
-- IMPORTANT: Before running this script:
-- 1. Go to Supabase dashboard → Authentication → Users
-- 2. Create users for each email listed below
-- 3. Set passwords and enable "Auto Confirm User"
-- 4. Copy each user's UUID from the dashboard (Authentication → Users → click user → User ID)
-- 5. Replace the placeholders below with the actual auth_user_id UUIDs
--
-- Run this after applying migrations 001 through 004.

BEGIN;

-- Insert User Accounts for Managers
-- Replace 'AUTH_UUID_HERE' with the actual Supabase auth.users.id for each user

INSERT INTO user_accounts (auth_user_id, actor_id, email, username, role) VALUES
-- Manager: Sara Johnson
('10ab0dd0-0a84-4437-8d80-82c7522f4c58', 'ab7a3be3-4950-50b1-a1b6-6783aa7a4725', 'sarah@gmail.com', 'sarah', 'manager'),

-- Manager: David Reynolds
('165649a8-515b-4eaf-8218-e944824e111c', '2fa6c4e0-be26-5f52-bd7f-286d7dd34b80', 'david.reynolds@gmail.com', 'david.reynolds', 'manager'),

-- Manager: Laura Mitchell
('88cb0d9b-3e05-48e6-b1a2-7948fcd7e66f', '128b8f0f-5f80-5ded-a75d-06936e394c51', 'laura.mitchell@gmail.com', 'laura.mitchell', 'manager'),

-- Manager: Kevin Thompson
('3885064f-8fce-4bb3-afbb-21dd3c7e0e6c', '197fb109-9e81-5753-a647-a71bdff88efd', 'kevin.thompson@gmail.com', 'kevin.thompson', 'manager'),

-- Owner: John Owner
('6891399f-2cec-42a0-ac2b-8b7ef9c90741', '943c73d1-ceda-5578-abb0-db914d931f46', 'johnowner@gmail.com', 'johnowner', 'owner'),

-- Owner: Michael Sterling
('83d3164d-543e-4578-916e-546d583059af', '078b51eb-4966-5e7f-8eae-d5151b79032e', 'michael.sterling@gmail.com', 'michael.sterling', 'owner'),

-- Owner: Olivia Bennett
('2cbac30e-3bcf-42d3-ab7a-db6b53bab391', '2089cded-11ce-5f91-99ed-df5af744494f', 'olivia.bennett@hotmail.com', 'olivia.bennett', 'owner'),

-- Owner: Robert Hayes
('485b737a-2801-4aab-8dd9-69dc1901ebd7', '20616874-23e7-57f1-a558-b935495d6d5b', 'hayesrobert@gmail.com', 'hayesrobert', 'owner'),

-- Owner: Sophia Reynolds
('2df41126-d7d0-4ddc-88a1-c470ffae3c9f', 'ed84c333-2c85-5ae5-9916-60f4d6c9921b', 'sreynolds@gmail.com', 'sreynolds', 'owner')
ON CONFLICT (auth_user_id) DO UPDATE SET
    actor_id = EXCLUDED.actor_id,
    email = EXCLUDED.email,
    username = EXCLUDED.username,
    role = EXCLUDED.role;

COMMIT;

-- After running this script, you can login with:
-- Manager: sarah@gmail.com (password you set in Supabase)
-- Owner: johnowner@gmail.com (password you set in Supabase)
