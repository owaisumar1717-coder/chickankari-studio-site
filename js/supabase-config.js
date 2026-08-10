/* ============================================
   Supabase configuration
   Replace these two values with your own project's
   URL and anon/public key (Supabase Dashboard → Project Settings → API)
   ============================================ */
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
