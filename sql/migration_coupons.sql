-- ============================================
-- Migration: Coupons
-- Run this in Supabase SQL Editor — your other tables already exist,
-- this only adds the coupons table and a couple of order columns.
-- ============================================

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null default 'percentage', -- 'percentage' or 'fixed'
  discount_value numeric(10,2) not null,
  min_order_amount numeric(10,2) default 0,
  usage_limit int,
  times_used int default 0,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table coupons enable row level security;

create policy "Public can view active coupons" on coupons for select using (is_active = true);
create policy "Admin full access coupons" on coupons for all using (auth.role() = 'authenticated');

-- Track which coupon (if any) was used on an order
alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists discount_amount numeric(10,2) default 0;
