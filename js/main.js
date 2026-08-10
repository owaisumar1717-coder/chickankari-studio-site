/* ============================================
   THE CHICKANKARI STUDIO — Shared site behavior
   ============================================ */

/* ---------- Header scroll state ---------- */
window.addEventListener('scroll', () => {
  const header = document.querySelector('.site-header');
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 40);
});

/* ---------- Mobile nav toggle ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.mobile-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
  }
  updateCartCount();
});

/* ---------- Cart (localStorage-based, no auth needed for shoppers) ---------- */
const CART_KEY = 'chikankari_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(product, qty = 1, size = null) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id && item.size === size);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image_url,
      size: size,
      qty: qty
    });
  }
  saveCart(cart);
}

function removeFromCart(id, size) {
  let cart = getCart();
  cart = cart.filter(item => !(item.id === id && item.size === size));
  saveCart(cart);
}

function updateCartQty(id, size, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id && i.size === size);
  if (item) {
    item.qty = Math.max(1, qty);
    saveCart(cart);
  }
}

function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartItemCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartCount() {
  const el = document.querySelector('.cart-count');
  if (el) el.textContent = cartItemCount();
}

function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

/* ---------- Newsletter form wiring (call on pages with .newsletter-form) ---------- */
function wireNewsletterForm() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;
    const { error } = await subscribeNewsletter(input.value);
    if (!error) {
      btn.textContent = 'Subscribed';
      input.value = '';
    } else {
      btn.textContent = 'Try again';
    }
    setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2500);
  });
}
