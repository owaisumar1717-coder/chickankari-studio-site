/* ============================================
   Admin Dashboard Logic
   ============================================ */

let currentUser = null;

/* ---------- Auth guard ---------- */
async function guardAuth() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return;
  }
  currentUser = data.session.user;
  document.getElementById('admin-email').textContent = currentUser.email;
}

document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

/* ---------- Tab switching ---------- */
function switchTab(tabName) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tabName).classList.add('active');
  document.querySelector(`.admin-nav button[data-tab="${tabName}"]`).classList.add('active');
  if (tabName === 'overview') loadOverview();
  if (tabName === 'products') loadProductsTable();
  if (tabName === 'orders') loadOrdersTable();
  if (tabName === 'content') loadContentForm();
  if (tabName === 'site-settings') loadSiteSettingsForm();
  if (tabName === 'testimonials') loadTestimonialsTable();
  if (tabName === 'blog') loadBlogTable();
  if (tabName === 'instagram') loadInstagramTable();
  if (tabName === 'karigars') loadKarigarsTable();
  if (tabName === 'coupons') loadCouponsTable();
}

document.querySelectorAll('.admin-nav button').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

/* ---------- Modal helpers ---------- */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.modal));
});

/* ============================================
   OVERVIEW
   ============================================ */
async function loadOverview() {
  const [{ count: productCount }, { data: pendingOrders }, { count: subCount }] = await Promise.all([
    supabaseClient.from('products').select('*', { count: 'exact', head: true }),
    supabaseClient.from('orders').select('id').eq('status', 'pending'),
    supabaseClient.from('newsletter_subscribers').select('*', { count: 'exact', head: true })
  ]);
  const { data: allOrders } = await supabaseClient.from('orders').select('subtotal');
  const revenue = (allOrders || []).reduce((s, o) => s + Number(o.subtotal), 0);

  document.getElementById('stat-products').textContent = productCount || 0;
  document.getElementById('stat-pending-orders').textContent = (pendingOrders || []).length;
  document.getElementById('stat-subscribers').textContent = subCount || 0;
  document.getElementById('stat-revenue').textContent = formatPrice(revenue);
}

/* ============================================
   PRODUCTS
   ============================================ */
let editingProductId = null;
let galleryState = { existing: [], newFiles: [] }; // existing: URLs already saved; newFiles: File objects pending upload

async function loadProductsTable() {
  const { data: products, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('products-tbody');
  if (error || !products || !products.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No products yet — click "Add Product" to create one.</td></tr>`;
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img class="thumb" src="${p.image_url || 'https://images.unsplash.com/photo-1610030181087-540c1c9c7bcb?q=80&w=100'}" alt=""></td>
      <td>${p.title}</td>
      <td>${p.category || '—'}</td>
      <td>${formatPrice(p.price)}</td>
      <td>${p.stock}</td>
      <td><span class="badge ${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Active' : 'Hidden'}</span></td>
      <td class="row-actions">
        <button onclick="editProduct('${p.id}')">Edit</button>
        <button class="danger" onclick="deleteProduct('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('');

  // Populate category suggestions from whatever categories already exist, so admin
  // can pick a previous one or freely type a brand-new category.
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  document.getElementById('category-suggestions').innerHTML = categories.map(c => `<option value="${c}">`).join('');
}

function renderGalleryPreview() {
  const wrap = document.getElementById('gallery-preview');
  const existingThumbs = galleryState.existing.map((url, i) => `
    <div style="position:relative; width:70px; height:88px;">
      <img src="${url}" style="width:100%; height:100%; object-fit:cover; border:1px solid var(--line);">
      <button type="button" onclick="removeExistingGalleryImage(${i})" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#a8433a; color:#fff; border:none; cursor:pointer; font-size:12px; line-height:1;">×</button>
    </div>`).join('');
  const newThumbs = galleryState.newFiles.map((file, i) => `
    <div style="position:relative; width:70px; height:88px;">
      <img src="${URL.createObjectURL(file)}" style="width:100%; height:100%; object-fit:cover; border:1px solid var(--gold);">
      <button type="button" onclick="removeNewGalleryImage(${i})" style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#a8433a; color:#fff; border:none; cursor:pointer; font-size:12px; line-height:1;">×</button>
    </div>`).join('');
  wrap.innerHTML = existingThumbs + newThumbs;
}

window.removeExistingGalleryImage = function(index) {
  galleryState.existing.splice(index, 1);
  renderGalleryPreview();
};
window.removeNewGalleryImage = function(index) {
  galleryState.newFiles.splice(index, 1);
  renderGalleryPreview();
};

document.getElementById('pf-gallery').addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  const totalCount = galleryState.existing.length + galleryState.newFiles.length + files.length;
  if (totalCount > 20) {
    alert('You can have up to 20 gallery photos per product.');
  }
  const room = Math.max(0, 20 - galleryState.existing.length - galleryState.newFiles.length);
  galleryState.newFiles.push(...files.slice(0, room));
  e.target.value = ''; // allow re-selecting the same file(s) later
  renderGalleryPreview();
});

document.getElementById('add-product-btn').addEventListener('click', () => {
  editingProductId = null;
  document.getElementById('product-modal-title').textContent = 'Add Product';
  document.getElementById('product-form').reset();
  document.getElementById('product-image-preview').style.display = 'none';
  galleryState = { existing: [], newFiles: [] };
  renderGalleryPreview();
  openModal('product-modal');
});

window.editProduct = async function(id) {
  const { data: p } = await supabaseClient.from('products').select('*').eq('id', id).single();
  if (!p) return;
  editingProductId = id;
  document.getElementById('product-modal-title').textContent = 'Edit Product';
  document.getElementById('pf-title').value = p.title || '';
  document.getElementById('pf-price').value = p.price || '';
  document.getElementById('pf-compare-price').value = p.compare_at_price || '';
  document.getElementById('pf-category').value = p.category || '';
  document.getElementById('pf-fabric').value = p.fabric || '';
  document.getElementById('pf-color').value = p.color || '';
  document.getElementById('pf-sizes').value = (p.sizes || []).join(', ');
  document.getElementById('pf-stock').value = p.stock || 0;
  document.getElementById('pf-description').value = p.description || '';
  document.getElementById('pf-featured').checked = !!p.is_featured;
  document.getElementById('pf-active').checked = p.is_active !== false;
  const preview = document.getElementById('product-image-preview');
  if (p.image_url) { preview.src = p.image_url; preview.style.display = 'block'; } else { preview.style.display = 'none'; }
  galleryState = { existing: [...(p.gallery_urls || [])], newFiles: [] };
  renderGalleryPreview();
  openModal('product-modal');
};

window.deleteProduct = async function(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  await supabaseClient.from('products').delete().eq('id', id);
  loadProductsTable();
};

document.getElementById('pf-image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('product-image-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('product-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  let imageUrl = document.getElementById('product-image-preview').src;
  const file = document.getElementById('pf-image').files[0];
  if (file) {
    const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }
  }

  // Upload any newly-added gallery photos
  if (galleryState.newFiles.length) {
    btn.textContent = `Uploading photos (0/${galleryState.newFiles.length})…`;
  }
  const uploadedGalleryUrls = [];
  for (let i = 0; i < galleryState.newFiles.length; i++) {
    const gFile = galleryState.newFiles[i];
    const filePath = `gallery-${Date.now()}-${i}-${gFile.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(filePath, gFile);
    if (!uploadError) {
      const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
      uploadedGalleryUrls.push(urlData.publicUrl);
    }
    btn.textContent = `Uploading photos (${i + 1}/${galleryState.newFiles.length})…`;
  }
  const finalGalleryUrls = [...galleryState.existing, ...uploadedGalleryUrls];

  const payload = {
    title: document.getElementById('pf-title').value,
    price: parseFloat(document.getElementById('pf-price').value),
    compare_at_price: document.getElementById('pf-compare-price').value ? parseFloat(document.getElementById('pf-compare-price').value) : null,
    category: document.getElementById('pf-category').value,
    fabric: document.getElementById('pf-fabric').value,
    color: document.getElementById('pf-color').value,
    sizes: document.getElementById('pf-sizes').value.split(',').map(s => s.trim()).filter(Boolean),
    stock: parseInt(document.getElementById('pf-stock').value) || 0,
    description: document.getElementById('pf-description').value,
    is_featured: document.getElementById('pf-featured').checked,
    is_active: document.getElementById('pf-active').checked,
    image_url: imageUrl && imageUrl.startsWith('http') ? imageUrl : null,
    gallery_urls: finalGalleryUrls
  };

  if (editingProductId) {
    await supabaseClient.from('products').update(payload).eq('id', editingProductId);
  } else {
    await supabaseClient.from('products').insert([payload]);
  }

  btn.disabled = false;
  btn.textContent = 'Save Product';
  closeModal('product-modal');
  loadProductsTable();
});

/* ============================================
   ORDERS
   ============================================ */
async function loadOrdersTable() {
  const { data: orders, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('orders-tbody');
  if (error || !orders || !orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No orders yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.order_number}</td>
      <td>${o.customer_name}<br><span style="color:var(--text-muted); font-size:0.8rem;">${o.customer_phone}</span></td>
      <td>${(o.items || []).length} item(s)</td>
      <td>${formatPrice(o.subtotal)}</td>
      <td>
        <span class="badge ${o.payment_status === 'paid' ? 'badge-active' : 'badge-pending'}">${o.payment_status === 'paid' ? 'Paid' : 'Unpaid'}</span>
        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; margin-top:0.2rem;">${o.payment_method || 'whatsapp'}</div>
      </td>
      <td>
        <select class="filter-select" style="font-size:0.8rem; padding:0.4em 0.7em;" onchange="updateOrderStatus('${o.id}', this.value)">
          ${['pending','confirmed','shipped','delivered','cancelled'].map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </td>
      <td class="row-actions"><button onclick="viewOrder('${o.id}')">View</button></td>
    </tr>
  `).join('');
  window._orders = orders;
}

window.updateOrderStatus = async function(id, status) {
  await supabaseClient.from('orders').update({ status }).eq('id', id);
};

window.viewOrder = function(id) {
  const o = window._orders.find(x => x.id === id);
  if (!o) return;
  const itemsHtml = (o.items || []).map(i => `<li>${i.title} ${i.size ? '(' + i.size + ')' : ''} × ${i.qty} — ${formatPrice(i.price * i.qty)}</li>`).join('');
  document.getElementById('order-detail-body').innerHTML = `
    <p><strong>Order:</strong> ${o.order_number}</p>
    <p><strong>Customer:</strong> ${o.customer_name} · ${o.customer_phone} ${o.customer_email ? '· ' + o.customer_email : ''}</p>
    <p><strong>Payment:</strong> ${o.payment_status === 'paid' ? 'Paid via Razorpay' : (o.payment_method === 'cod' ? 'Cash on Delivery' : 'Unpaid')} ${o.razorpay_payment_id ? '(' + o.razorpay_payment_id + ')' : ''}</p>
    <p><strong>Address:</strong> ${o.shipping_address}, ${o.city} - ${o.pincode}</p>
    ${o.notes ? `<p><strong>Notes:</strong> ${o.notes}</p>` : ''}
    <p style="margin-top:1rem;"><strong>Items:</strong></p>
    <ul style="margin: 0.5rem 0 1rem 1.2rem;">${itemsHtml}</ul>
    <p><strong>Subtotal:</strong> ${formatPrice(o.subtotal)}</p>
  `;
  openModal('order-modal');
};

/* ============================================
   HOMEPAGE CONTENT
   ============================================ */
async function loadContentForm() {
  const content = await fetchAllSiteContent();
  const map = {};
  content.forEach(c => map[c.content_key] = c.content_value);
  document.getElementById('cf-eyebrow').value = map.hero_eyebrow || '';
  document.getElementById('cf-heading').value = map.hero_heading || '';
  document.getElementById('cf-subtext').value = map.hero_subtext || '';
  document.getElementById('cf-about').value = map.about_snippet || '';
  const preview = document.getElementById('hero-image-preview');
  if (map.hero_image) { preview.src = map.hero_image; preview.style.display = 'block'; }
}

document.getElementById('content-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('content-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  let heroImageUrl = document.getElementById('hero-image-preview').src;
  const file = document.getElementById('cf-hero-image').files[0];
  if (file) {
    const filePath = `hero-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
      heroImageUrl = urlData.publicUrl;
    }
  }

  const updates = [
    { content_key: 'hero_eyebrow', content_value: document.getElementById('cf-eyebrow').value },
    { content_key: 'hero_heading', content_value: document.getElementById('cf-heading').value },
    { content_key: 'hero_subtext', content_value: document.getElementById('cf-subtext').value },
    { content_key: 'about_snippet', content_value: document.getElementById('cf-about').value }
  ];
  if (heroImageUrl && heroImageUrl.startsWith('http')) {
    updates.push({ content_key: 'hero_image', content_value: heroImageUrl });
  }

  for (const u of updates) {
    await supabaseClient.from('site_content').upsert(u, { onConflict: 'content_key' });
  }

  btn.disabled = false;
  btn.textContent = 'Content saved ✓';
  setTimeout(() => { btn.textContent = 'Save Homepage Content'; }, 2000);
});

document.getElementById('cf-hero-image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('hero-image-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
});

/* ============================================
   SITE SETTINGS (WhatsApp / Instagram / Email — sitewide)
   ============================================ */
async function loadSiteSettingsForm() {
  const content = await fetchAllSiteContent();
  const map = {};
  content.forEach(c => map[c.content_key] = c.content_value);
  document.getElementById('sf-whatsapp').value = map.whatsapp_number || '';
  document.getElementById('sf-instagram').value = map.instagram_url || '';
  document.getElementById('sf-email').value = map.contact_email || '';
}

document.getElementById('site-settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('site-settings-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const updates = [
    { content_key: 'whatsapp_number', content_value: document.getElementById('sf-whatsapp').value.trim() },
    { content_key: 'instagram_url', content_value: document.getElementById('sf-instagram').value.trim() },
    { content_key: 'contact_email', content_value: document.getElementById('sf-email').value.trim() }
  ];

  for (const u of updates) {
    await supabaseClient.from('site_content').upsert(u, { onConflict: 'content_key' });
  }

  btn.disabled = false;
  btn.textContent = 'Settings saved ✓';
  setTimeout(() => { btn.textContent = 'Save Site Settings'; }, 2000);
});

/* ============================================
   TESTIMONIALS
   ============================================ */
let editingTestimonialId = null;

async function loadTestimonialsTable() {
  const { data, error } = await supabaseClient.from('testimonials').select('*').order('sort_order');
  const tbody = document.getElementById('testimonials-tbody');
  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No testimonials yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(t => `
    <tr>
      <td>${t.customer_name}</td>
      <td style="max-width:320px;">${t.quote}</td>
      <td>${'★'.repeat(t.rating)}</td>
      <td class="row-actions">
        <button onclick="editTestimonial('${t.id}')">Edit</button>
        <button class="danger" onclick="deleteTestimonial('${t.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('add-testimonial-btn').addEventListener('click', () => {
  editingTestimonialId = null;
  document.getElementById('testimonial-form').reset();
  document.getElementById('testimonial-modal-title').textContent = 'Add Testimonial';
  openModal('testimonial-modal');
});

window.editTestimonial = async function(id) {
  const { data: t } = await supabaseClient.from('testimonials').select('*').eq('id', id).single();
  if (!t) return;
  editingTestimonialId = id;
  document.getElementById('testimonial-modal-title').textContent = 'Edit Testimonial';
  document.getElementById('tf-name').value = t.customer_name;
  document.getElementById('tf-quote').value = t.quote;
  document.getElementById('tf-rating').value = t.rating;
  openModal('testimonial-modal');
};

window.deleteTestimonial = async function(id) {
  if (!confirm('Delete this testimonial?')) return;
  await supabaseClient.from('testimonials').delete().eq('id', id);
  loadTestimonialsTable();
};

document.getElementById('testimonial-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    customer_name: document.getElementById('tf-name').value,
    quote: document.getElementById('tf-quote').value,
    rating: parseInt(document.getElementById('tf-rating').value)
  };
  if (editingTestimonialId) {
    await supabaseClient.from('testimonials').update(payload).eq('id', editingTestimonialId);
  } else {
    await supabaseClient.from('testimonials').insert([payload]);
  }
  closeModal('testimonial-modal');
  loadTestimonialsTable();
});

/* ============================================
   BLOG
   ============================================ */
let editingPostId = null;

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
}

async function loadBlogTable() {
  const { data, error } = await supabaseClient.from('blog_posts').select('*').order('published_at', { ascending: false });
  const tbody = document.getElementById('blog-tbody');
  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No posts yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td>${p.title}</td>
      <td>${new Date(p.published_at).toLocaleDateString('en-IN')}</td>
      <td><span class="badge ${p.is_published ? 'badge-active' : 'badge-inactive'}">${p.is_published ? 'Published' : 'Draft'}</span></td>
      <td class="row-actions">
        <button onclick="editPost('${p.id}')">Edit</button>
        <button class="danger" onclick="deletePost('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('add-post-btn').addEventListener('click', () => {
  editingPostId = null;
  document.getElementById('post-form').reset();
  document.getElementById('post-modal-title').textContent = 'Add Journal Post';
  document.getElementById('post-image-preview').style.display = 'none';
  openModal('post-modal');
});

window.editPost = async function(id) {
  const { data: p } = await supabaseClient.from('blog_posts').select('*').eq('id', id).single();
  if (!p) return;
  editingPostId = id;
  document.getElementById('post-modal-title').textContent = 'Edit Journal Post';
  document.getElementById('bf-title').value = p.title;
  document.getElementById('bf-excerpt').value = p.excerpt || '';
  document.getElementById('bf-content').value = p.content || '';
  document.getElementById('bf-published').checked = p.is_published !== false;
  const preview = document.getElementById('post-image-preview');
  if (p.cover_image) { preview.src = p.cover_image; preview.style.display = 'block'; } else { preview.style.display = 'none'; }
  openModal('post-modal');
};

window.deletePost = async function(id) {
  if (!confirm('Delete this post?')) return;
  await supabaseClient.from('blog_posts').delete().eq('id', id);
  loadBlogTable();
};

document.getElementById('bf-image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('post-image-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
});

document.getElementById('post-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('post-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  let coverUrl = document.getElementById('post-image-preview').src;
  const file = document.getElementById('bf-image').files[0];
  if (file) {
    const filePath = `blog-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
      coverUrl = urlData.publicUrl;
    }
  }

  const title = document.getElementById('bf-title').value;
  const payload = {
    title,
    slug: slugify(title) + '-' + Math.random().toString(36).slice(2, 6),
    excerpt: document.getElementById('bf-excerpt').value,
    content: document.getElementById('bf-content').value,
    is_published: document.getElementById('bf-published').checked,
    cover_image: coverUrl && coverUrl.startsWith('http') ? coverUrl : null
  };

  if (editingPostId) {
    delete payload.slug; // don't change slug on edit to avoid breaking existing links
    await supabaseClient.from('blog_posts').update(payload).eq('id', editingPostId);
  } else {
    await supabaseClient.from('blog_posts').insert([payload]);
  }

  btn.disabled = false;
  btn.textContent = 'Save Post';
  closeModal('post-modal');
  loadBlogTable();
});

/* ============================================
   INSTAGRAM HIGHLIGHTS
   ============================================ */
let editingInstagramId = null;

async function loadInstagramTable() {
  const { data, error } = await supabaseClient.from('instagram_posts').select('*').order('sort_order');
  const tbody = document.getElementById('instagram-tbody');
  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:2rem; color:var(--text-muted);">No posts yet — add one to show it on your homepage.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(p => `
    <tr>
      <td><img class="thumb" src="${p.image_url}" alt=""></td>
      <td style="max-width:280px;">${p.caption || '—'}</td>
      <td><span class="badge ${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Visible' : 'Hidden'}</span></td>
      <td class="row-actions">
        <button onclick="editInstagramPost('${p.id}')">Edit</button>
        <button class="danger" onclick="deleteInstagramPost('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('add-instagram-btn').addEventListener('click', () => {
  editingInstagramId = null;
  document.getElementById('instagram-form').reset();
  document.getElementById('instagram-modal-title').textContent = 'Add Instagram Post';
  document.getElementById('instagram-image-preview').style.display = 'none';
  openModal('instagram-modal');
});

window.editInstagramPost = async function(id) {
  const { data: p } = await supabaseClient.from('instagram_posts').select('*').eq('id', id).single();
  if (!p) return;
  editingInstagramId = id;
  document.getElementById('instagram-modal-title').textContent = 'Edit Instagram Post';
  document.getElementById('if-caption').value = p.caption || '';
  document.getElementById('if-link').value = p.post_link || '';
  document.getElementById('if-active').checked = p.is_active !== false;
  const preview = document.getElementById('instagram-image-preview');
  if (p.image_url) { preview.src = p.image_url; preview.style.display = 'block'; } else { preview.style.display = 'none'; }
  openModal('instagram-modal');
};

window.deleteInstagramPost = async function(id) {
  if (!confirm('Delete this post from your homepage highlights?')) return;
  await supabaseClient.from('instagram_posts').delete().eq('id', id);
  loadInstagramTable();
};

document.getElementById('if-image').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('instagram-image-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
});

document.getElementById('instagram-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('instagram-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  let imageUrl = document.getElementById('instagram-image-preview').src;
  const file = document.getElementById('if-image').files[0];
  if (file) {
    const filePath = `insta-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
      imageUrl = urlData.publicUrl;
    }
  }

  if (!imageUrl || !imageUrl.startsWith('http')) {
    alert('Please choose an image before saving.');
    btn.disabled = false;
    btn.textContent = 'Save Post';
    return;
  }

  const payload = {
    image_url: imageUrl,
    caption: document.getElementById('if-caption').value,
    post_link: document.getElementById('if-link').value || null,
    is_active: document.getElementById('if-active').checked
  };

  if (editingInstagramId) {
    await supabaseClient.from('instagram_posts').update(payload).eq('id', editingInstagramId);
  } else {
    await supabaseClient.from('instagram_posts').insert([payload]);
  }

  btn.disabled = false;
  btn.textContent = 'Save Post';
  closeModal('instagram-modal');
  loadInstagramTable();
});

/* ============================================
   KARIGARS
   ============================================ */
let editingKarigarId = null;

async function loadKarigarsTable() {
  const { data, error } = await supabaseClient.from('karigars').select('*').order('sort_order');
  const tbody = document.getElementById('karigars-tbody');
  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No karigars added yet — the About page will show default example profiles until you add your own.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(k => `
    <tr>
      <td><img class="thumb" style="border-radius:50%;" src="${k.photo_url || 'https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=100'}" alt=""></td>
      <td>${k.name}</td>
      <td>${k.years_experience ? k.years_experience + ' yrs' : '—'}</td>
      <td style="max-width:220px;">${k.specialty || '—'}</td>
      <td><span class="badge ${k.is_active ? 'badge-active' : 'badge-inactive'}">${k.is_active ? 'Visible' : 'Hidden'}</span></td>
      <td class="row-actions">
        <button onclick="editKarigar('${k.id}')">Edit</button>
        <button class="danger" onclick="deleteKarigar('${k.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('add-karigar-btn').addEventListener('click', () => {
  editingKarigarId = null;
  document.getElementById('karigar-form').reset();
  document.getElementById('karigar-modal-title').textContent = 'Add Karigar';
  document.getElementById('karigar-image-preview').style.display = 'none';
  openModal('karigar-modal');
});

window.editKarigar = async function(id) {
  const { data: k } = await supabaseClient.from('karigars').select('*').eq('id', id).single();
  if (!k) return;
  editingKarigarId = id;
  document.getElementById('karigar-modal-title').textContent = 'Edit Karigar';
  document.getElementById('kf-name').value = k.name;
  document.getElementById('kf-experience').value = k.years_experience || '';
  document.getElementById('kf-specialty').value = k.specialty || '';
  document.getElementById('kf-active').checked = k.is_active !== false;
  const preview = document.getElementById('karigar-image-preview');
  if (k.photo_url) { preview.src = k.photo_url; preview.style.display = 'block'; } else { preview.style.display = 'none'; }
  openModal('karigar-modal');
};

window.deleteKarigar = async function(id) {
  if (!confirm('Delete this karigar from the About page?')) return;
  await supabaseClient.from('karigars').delete().eq('id', id);
  loadKarigarsTable();
};

document.getElementById('kf-photo').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('karigar-image-preview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
});

document.getElementById('karigar-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('karigar-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  let photoUrl = document.getElementById('karigar-image-preview').src;
  const file = document.getElementById('kf-photo').files[0];
  if (file) {
    const filePath = `karigar-${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const { error: uploadError } = await supabaseClient.storage.from('product-images').upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabaseClient.storage.from('product-images').getPublicUrl(filePath);
      photoUrl = urlData.publicUrl;
    }
  }

  const payload = {
    name: document.getElementById('kf-name').value,
    years_experience: document.getElementById('kf-experience').value ? parseInt(document.getElementById('kf-experience').value) : null,
    specialty: document.getElementById('kf-specialty').value,
    is_active: document.getElementById('kf-active').checked,
    photo_url: photoUrl && photoUrl.startsWith('http') ? photoUrl : null
  };

  if (editingKarigarId) {
    await supabaseClient.from('karigars').update(payload).eq('id', editingKarigarId);
  } else {
    await supabaseClient.from('karigars').insert([payload]);
  }

  btn.disabled = false;
  btn.textContent = 'Save Karigar';
  closeModal('karigar-modal');
  loadKarigarsTable();
});

/* ============================================
   COUPONS
   ============================================ */
let editingCouponId = null;

async function loadCouponsTable() {
  const { data, error } = await supabaseClient.from('coupons').select('*').order('created_at', { ascending: false });
  const tbody = document.getElementById('coupons-tbody');
  if (error || !data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No coupons yet — click "Add Coupon" to create one.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => {
    const discountLabel = c.discount_type === 'percentage' ? `${c.discount_value}%` : formatPrice(c.discount_value);
    const usedLabel = c.usage_limit ? `${c.times_used} / ${c.usage_limit}` : `${c.times_used} / ∞`;
    const expiresLabel = c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—';
    const expired = c.expires_at && new Date(c.expires_at) < new Date();
    return `
    <tr>
      <td><strong>${c.code}</strong></td>
      <td>${discountLabel}</td>
      <td>${c.min_order_amount ? formatPrice(c.min_order_amount) : '—'}</td>
      <td>${usedLabel}</td>
      <td>${expiresLabel}</td>
      <td><span class="badge ${c.is_active && !expired ? 'badge-active' : 'badge-inactive'}">${expired ? 'Expired' : (c.is_active ? 'Active' : 'Inactive')}</span></td>
      <td class="row-actions">
        <button onclick="editCoupon('${c.id}')">Edit</button>
        <button class="danger" onclick="deleteCoupon('${c.id}')">Delete</button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('add-coupon-btn').addEventListener('click', () => {
  editingCouponId = null;
  document.getElementById('coupon-form').reset();
  document.getElementById('coupon-modal-title').textContent = 'Add Coupon';
  openModal('coupon-modal');
});

window.editCoupon = async function(id) {
  const { data: c } = await supabaseClient.from('coupons').select('*').eq('id', id).single();
  if (!c) return;
  editingCouponId = id;
  document.getElementById('coupon-modal-title').textContent = 'Edit Coupon';
  document.getElementById('cpf-code').value = c.code;
  document.getElementById('cpf-type').value = c.discount_type;
  document.getElementById('cpf-value').value = c.discount_value;
  document.getElementById('cpf-min-order').value = c.min_order_amount || 0;
  document.getElementById('cpf-usage-limit').value = c.usage_limit || '';
  document.getElementById('cpf-expires').value = c.expires_at ? c.expires_at.slice(0, 10) : '';
  document.getElementById('cpf-active').checked = c.is_active !== false;
  openModal('coupon-modal');
};

window.deleteCoupon = async function(id) {
  if (!confirm('Delete this coupon?')) return;
  await supabaseClient.from('coupons').delete().eq('id', id);
  loadCouponsTable();
};

document.getElementById('coupon-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('coupon-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const payload = {
    code: document.getElementById('cpf-code').value.trim().toUpperCase(),
    discount_type: document.getElementById('cpf-type').value,
    discount_value: parseFloat(document.getElementById('cpf-value').value),
    min_order_amount: parseFloat(document.getElementById('cpf-min-order').value) || 0,
    usage_limit: document.getElementById('cpf-usage-limit').value ? parseInt(document.getElementById('cpf-usage-limit').value) : null,
    expires_at: document.getElementById('cpf-expires').value ? new Date(document.getElementById('cpf-expires').value).toISOString() : null,
    is_active: document.getElementById('cpf-active').checked
  };

  let saveError;
  if (editingCouponId) {
    const { error } = await supabaseClient.from('coupons').update(payload).eq('id', editingCouponId);
    saveError = error;
  } else {
    const { error } = await supabaseClient.from('coupons').insert([payload]);
    saveError = error;
  }

  btn.disabled = false;
  btn.textContent = 'Save Coupon';

  if (saveError) {
    alert(saveError.message.includes('duplicate') ? 'This coupon code already exists.' : 'Could not save coupon: ' + saveError.message);
    return;
  }

  closeModal('coupon-modal');
  loadCouponsTable();
});

/* ---------- Init ---------- */
guardAuth().then(() => switchTab('overview'));
