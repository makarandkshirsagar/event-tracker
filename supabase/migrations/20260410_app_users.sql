-- ============================================================
-- App Users Table for Authentication
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.app_users (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  username    text        UNIQUE NOT NULL,
  full_name   text        NOT NULL,
  email       text        UNIQUE NOT NULL,
  password_hash text      NOT NULL,
  role        text        DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status      text        DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Allow anon key to read (required for login lookup)
CREATE POLICY "app_users_select" ON public.app_users
  FOR SELECT USING (true);

-- Allow anon key to insert (required for registration)
CREATE POLICY "app_users_insert" ON public.app_users
  FOR INSERT WITH CHECK (true);

-- Allow anon key to update (required for admin approval)
CREATE POLICY "app_users_update" ON public.app_users
  FOR UPDATE USING (true);

-- ============================================================
-- NOTE: When the app first loads with no admin in this table,
-- it will show a "Create Admin Account" setup screen.
-- ============================================================
