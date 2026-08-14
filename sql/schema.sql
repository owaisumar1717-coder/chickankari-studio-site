-- ============================================
-- THE CHICKANKARI STUDIO — Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- ---------- PRODUCTS ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  category text,
  fabric text,
  color text,
  sizes text[] default '{}',
  stock int default 0,
  image_url text,
  gallery_urls text[] default '{}',
  is_featured boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- ORDERS ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique default ('CKS-' || to_char(now(), 'YYMMDD') || '-' || substr(md5(random()::text), 1, 5)),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  shipping_address text not null,
  city text,
  pincode text,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  status text default 'pending',
  notes text,
  payment_status text default 'unpaid',
  payment_method text default 'whatsapp',
  razorpay_order_id text,
  razorpay_payment_id text,
  coupon_code text,
  discount_amount numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- ---------- SITE CONTENT (editable homepage banner/text + sitewide settings) ----------
create table if not exists site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text unique not null,
  content_value text,
  updated_at timestamptz default now()
);

insert into site_content (content_key, content_value) values
  ('hero_eyebrow', 'Lucknowi Chikankari, Handcrafted'),
  ('hero_heading', 'Threads that carry a city''s memory'),
  ('hero_subtext', 'Each piece hand-embroidered by Lucknow''s karigars, using stitches passed down for generations.'),
  ('hero_image', ''),
  ('about_snippet', 'For over two centuries, Chikankari has been Lucknow''s quiet art — white thread on fine fabric, worked entirely by hand. THE CHICKANKARI STUDIO brings that craft to your wardrobe, unhurried and true to its roots.'),
  ('whatsapp_number', '918920819540'),
  ('instagram_url', 'https://www.instagram.com/thechickankaristudio?igsh=MXhlc2xvZW5zaGs0Mw%3D%3D&utm_source=qr'),
  ('contact_email', 'hello@thechickankaristudio.com')
on conflict (content_key) do nothing;

-- ---------- TESTIMONIALS ----------
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  quote text not null,
  rating int default 5,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- BLOG ----------
create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  cover_image text,
  author text default 'The Chickankari Studio',
  is_published boolean default true,
  published_at timestamptz default now()
);

-- ---------- INSTAGRAM HIGHLIGHTS (manually curated, not live-synced) ----------
create table if not exists instagram_posts (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  post_link text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- KARIGARS (artisans featured on the About page) ----------
create table if not exists karigars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  years_experience int,
  specialty text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ---------- COUPONS ----------
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

-- ---------- NEWSLETTER ----------
create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  subscribed_at timestamptz default now()
);

-- ---------- CONTACT MESSAGES ----------
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  message text not null,
  created_at timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table products enable row level security;
alter table orders enable row level security;
alter table site_content enable row level security;
alter table testimonials enable row level security;
alter table blog_posts enable row level security;
alter table instagram_posts enable row level security;
alter table karigars enable row level security;
alter table coupons enable row level security;
alter table newsletter_subscribers enable row level security;
alter table contact_messages enable row level security;

-- Public read access
create policy "Public can view active products" on products for select using (is_active = true);
create policy "Public can view site content" on site_content for select using (true);
create policy "Public can view active testimonials" on testimonials for select using (is_active = true);
create policy "Public can view published blog posts" on blog_posts for select using (is_published = true);
create policy "Public can view active instagram posts" on instagram_posts for select using (is_active = true);
create policy "Public can view active karigars" on karigars for select using (is_active = true);
create policy "Public can view active coupons" on coupons for select using (is_active = true);

-- Public insert access (checkout / newsletter / contact form — no login needed)
create policy "Public can create orders" on orders for insert with check (true);
create policy "Public can subscribe" on newsletter_subscribers for insert with check (true);
create policy "Public can send messages" on contact_messages for insert with check (true);

-- Admin (authenticated) full access
create policy "Admin full access products" on products for all using (auth.role() = 'authenticated');
create policy "Admin full access orders" on orders for all using (auth.role() = 'authenticated');
create policy "Admin full access site_content" on site_content for all using (auth.role() = 'authenticated');
create policy "Admin full access testimonials" on testimonials for all using (auth.role() = 'authenticated');
create policy "Admin full access blog_posts" on blog_posts for all using (auth.role() = 'authenticated');
create policy "Admin full access instagram_posts" on instagram_posts for all using (auth.role() = 'authenticated');
create policy "Admin full access karigars" on karigars for all using (auth.role() = 'authenticated');
create policy "Admin full access coupons" on coupons for all using (auth.role() = 'authenticated');
create policy "Admin can view newsletter" on newsletter_subscribers for select using (auth.role() = 'authenticated');
create policy "Admin can view contact_messages" on contact_messages for select using (auth.role() = 'authenticated');

-- ============================================
-- STORAGE (product images)
-- ============================================
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public can view product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "Admin can upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "Admin can update product images" on storage.objects for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "Admin can delete product images" on storage.objects for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
