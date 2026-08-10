-- ============================================
-- Migration: Razorpay payment fields
-- Run this in Supabase SQL Editor (after schema.sql)
-- ============================================

alter table orders add column if not exists payment_status text default 'unpaid'; -- unpaid, paid, failed
alter table orders add column if not exists payment_method text default 'whatsapp'; -- whatsapp, razorpay, cod
alter table orders add column if not exists razorpay_order_id text;
alter table orders add column if not exists razorpay_payment_id text;

-- NOTE: We do NOT add a public "update order" policy here on purpose.
-- Letting the anon key update orders directly would let any visitor mark
-- any order as paid/delivered. Instead, payment confirmation is written
-- server-side by the verify-razorpay-payment Netlify Function using the
-- Supabase SERVICE ROLE key, which bypasses RLS safely. The service role
-- key never touches the browser.
