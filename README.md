# THE CHICKANKARI STUDIO — Website Setup Guide

Poora site static HTML/CSS/JS mein bana hai (jaisa aap Travelesque aur Jaksman mein use kar rahe ho) + Supabase backend + admin panel.

## Folder Structure
```
chikankari-site/
├── index.html          → Homepage
├── shop.html            → Product listing
├── product.html          → Product detail (dynamic via ?id=)
├── about.html            → Brand story
├── blog.html             → Journal listing
├── blog-post.html        → Single post (dynamic via ?slug=)
├── contact.html          → Contact form
├── cart.html              → Cart + checkout
├── admin/
│   ├── login.html         → Admin sign-in
│   ├── dashboard.html      → Admin panel (products, orders, content, testimonials, blog)
│   ├── admin.css
│   └── admin.js
├── css/style.css          → Full design system
├── js/main.js              → Cart logic, nav behavior
├── js/supabase-config.js   → ⚠️ ADD YOUR SUPABASE KEYS HERE
├── sql/schema.sql           → Run this in Supabase to create all tables
└── assets/logo.png
```

## Step 1 — Supabase Project Setup
1. [supabase.com](https://supabase.com) par naya project banao (jaise Travelesque ke liye banaya tha).
2. **SQL Editor** mein jao → `sql/schema.sql` ka poora content paste karke Run karo. Ye sab tables (products, orders, testimonials, blog_posts, site_content, newsletter, contact) aur security rules bana dega.
3. **Storage** tab check karo — `product-images` naam ka public bucket automatically ban jayega (schema.sql mein include hai).
4. **Project Settings → API** mein jao aur copy karo:
   - Project URL
   - `anon` `public` key
5. `js/supabase-config.js` file kholo aur `YOUR_SUPABASE_PROJECT_URL` aur `YOUR_SUPABASE_ANON_KEY` ko apni actual values se replace karo.

## Step 2 — Admin Login Banao
1. Supabase Dashboard → **Authentication → Users** → "Add User" par click karo.
2. Apna email aur ek strong password daalo (ye aapka admin login hoga).
3. Ab `admin/login.html` par jaake isi email/password se login kar sakte ho.

⚠️ Important: Admin panel ka access sirf usi email/password se milega jo aap Supabase Auth mein add karte ho. Ye publicly visible nahi hai — sirf `/admin/login.html` URL pe jaake koi login try kar sakta hai, lekin bina valid credentials ke andar nahi ja payega.

## Step 3 — GitHub Push
```bash
cd chikankari-site
git init
git add .
git commit -m "Initial Chickankari Studio website"
git remote add origin https://github.com/syedmohammadowais17/chickankari-studio-site.git
git branch -M main
git push -u origin main
```

## Step 4 — Netlify Deploy
1. Netlify Dashboard → "Add new site" → "Import from GitHub" → apna repo select karo.
2. Build settings: kuch bhi set karne ki zarurat nahi (ye static site hai) — build command khali chhod do, publish directory `.` (root) rakho. `netlify.toml` already bata deta hai ki functions kahan hain.
3. Deploy karo. Live URL mil jayega.

## Step 5 — Razorpay Payment Gateway Setup
Payment gateway **serverless functions** (Netlify Functions) ke through kaam karta hai — isliye Razorpay ka secret key kabhi bhi frontend code mein expose nahi hota, sirf Netlify ke secure environment variables mein rehta hai.

1. **Supabase migration run karo:** `sql/migration_razorpay.sql` ka content Supabase SQL Editor mein paste karke run karo (ye `orders` table mein payment tracking columns add karta hai).
2. [razorpay.com](https://razorpay.com) par account banao (agar nahi hai) → KYC complete karo for live payments (test mode bina KYC ke turant use kar sakte ho).
3. Razorpay Dashboard → **Settings → API Keys** → "Generate Test Key" (testing ke liye) ya "Generate Live Key" (real payments ke liye). Ye 2 cheezein milengi:
   - `Key Id` (jaise `rzp_test_xxxxx`)
   - `Key Secret`
4. Supabase Dashboard → **Project Settings → API** mein jao, wahan se `service_role` key copy karo (⚠️ ye alag hai `anon` key se — bahut powerful hai, kabhi frontend mein mat daalna).
5. Netlify Dashboard → apna site → **Site Configuration → Environment Variables** → ye 4 variables add karo:
   | Key | Value |
   |---|---|
   | `RAZORPAY_KEY_ID` | Razorpay se mila Key Id |
   | `RAZORPAY_KEY_SECRET` | Razorpay se mila Key Secret |
   | `SUPABASE_URL` | Aapka Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase se mila service_role key |
6. Site ko re-deploy karo (env variables add karne ke baad Netlify ek naya deploy trigger karta hai, ya "Trigger deploy" manually click karo).

### Testing
Razorpay **test mode** mein test card number `4111 1111 1111 1111`, koi bhi future expiry date, aur koi bhi CVV use karke checkout test kar sakte ho — real paisa nahi katega.

### Test se Live mein jaane ke liye
Bas Netlify environment variables mein `RAZORPAY_KEY_ID` aur `RAZORPAY_KEY_SECRET` ko test keys se live keys se replace kar do, aur re-deploy karo.

### Checkout Flow (customer ke liye)
Customer checkout par **"Pay Online"** (Razorpay — card/UPI/netbanking) ya **"Cash on Delivery"** choose kar sakta hai. Online payment ke baad, signature server-side verify hoti hai aur order automatically "Paid" mark ho jata hai admin panel mein.

## Content Aap Khud Edit Kar Sakte Ho (bina code chhue)
Admin panel (`/admin/login.html`) se:
- **Products** — Add/Edit/Delete, images upload, price, stock, sizes
- **Orders** — Sabhi orders dekho, status update karo (pending → confirmed → shipped → delivered)
- **Homepage Content** — Hero heading, subtext, hero image, about section text
- **Testimonials** — Customer reviews add/edit/delete
- **Journal/Blog** — Craft-related posts likho, cover image ke saath

## Cheezein Jo Aapko Khud Update Karni Hain
- `index.html`, `shop.html` etc. mein WhatsApp number (`910000000000`) → apna asli number daalo
- Email address (`hello@thechickankaristudio.com`) → apna asli email daalo
- Razorpay setup (Step 5 dekho) — iske bina "Pay Online" checkout kaam nahi karega, lekin Cash on Delivery tab tak bhi kaam karta rahega

## Placeholder Images
Kuch jagah Unsplash se placeholder images use ki hain (product photos ke liye) jab tak aap apne asli product photos admin panel se upload nahi karte. Ye sab automatically replace ho jayengi jaise hi aap products add karoge.
