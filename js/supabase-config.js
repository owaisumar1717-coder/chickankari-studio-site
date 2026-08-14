/* ============================================
   Supabase configuration
   Replace these two values with your own project's
   URL and anon/public key (Supabase Dashboard → Project Settings → API)
   ============================================ */
const SUPABASE_URL = 'https://fxyyfxnfondqfnsyqnze.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XxmJpCmaGC-5OS_e1hi6bw_1bMPXgF7';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------- Products ---------- */
async function fetchProducts(filters = {}) {
  let query = supabaseClient.from('products').select('*').eq('is_active', true);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.fabric) query = query.eq('fabric', filters.fabric);
  if (filters.color) query = query.eq('color', filters.color);
  if (filters.sort === 'price_asc') query = query.order('price', { ascending: true });
  else if (filters.sort === 'price_desc') query = query.order('price', { ascending: false });
  else query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) { console.error('fetchProducts error:', error); return []; }
  return data;
}

async function fetchProductById(id) {
  const { data, error } = await supabaseClient.from('products').select('*').eq('id', id).single();
  if (error) { console.error('fetchProductById error:', error); return null; }
  return data;
}

async function fetchFeaturedProducts(limit = 4) {
  const { data, error } = await supabaseClient.from('products').select('*').eq('is_active', true).eq('is_featured', true).limit(limit);
  if (error) { console.error(error); return []; }
  return data;
}

/* ---------- Coupons ---------- */
async function validateCoupon(code, subtotal) {
  const { data, error } = await supabaseClient
    .from('coupons')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !data) return { valid: false, message: 'Coupon code not found.' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false, message: 'This coupon has expired.' };
  if (data.usage_limit !== null && data.times_used >= data.usage_limit) return { valid: false, message: 'This coupon has reached its usage limit.' };
  if (subtotal < Number(data.min_order_amount || 0)) return { valid: false, message: `Minimum order of ${formatPrice(data.min_order_amount)} needed for this coupon.` };

  const discount = data.discount_type === 'percentage'
    ? Math.round(subtotal * (Number(data.discount_value) / 100))
    : Math.min(Number(data.discount_value), subtotal);

  return { valid: true, coupon: data, discount };
}

async function incrementCouponUsage(couponId, currentTimesUsed) {
  await supabaseClient.from('coupons').update({ times_used: (currentTimesUsed || 0) + 1 }).eq('id', couponId);
}

/* ---------- Orders ---------- */
async function createOrder(order) {
  const { data, error } = await supabaseClient.from('orders').insert([order]).select().single();
  if (error) { console.error('createOrder error:', error); return { error }; }
  return { data };
}

/* ---------- Homepage content ---------- */
async function fetchSiteContent(key) {
  const { data, error } = await supabaseClient.from('site_content').select('*').eq('content_key', key).single();
  if (error) { return null; }
  return data;
}

async function fetchAllSiteContent() {
  const { data, error } = await supabaseClient.from('site_content').select('*');
  if (error) { console.error(error); return []; }
  return data;
}

/* ---------- Testimonials ---------- */
async function fetchTestimonials() {
  const { data, error } = await supabaseClient.from('testimonials').select('*').eq('is_active', true).order('sort_order');
  if (error) { console.error(error); return []; }
  return data;
}

/* ---------- Blog ---------- */
async function fetchBlogPosts() {
  const { data, error } = await supabaseClient.from('blog_posts').select('*').eq('is_published', true).order('published_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function fetchBlogPostBySlug(slug) {
  const { data, error } = await supabaseClient.from('blog_posts').select('*').eq('slug', slug).single();
  if (error) { console.error(error); return null; }
  return data;
}

/* ---------- Newsletter ---------- */
async function subscribeNewsletter(email) {
  const { error } = await supabaseClient.from('newsletter_subscribers').insert([{ email }]);
  return { error };
}

/* ---------- Contact ---------- */
async function submitContactForm(payload) {
  const { error } = await supabaseClient.from('contact_messages').insert([payload]);
  return { error };
}
