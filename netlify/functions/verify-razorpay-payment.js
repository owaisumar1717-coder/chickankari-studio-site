// netlify/functions/verify-razorpay-payment.js
// Verifies the Razorpay payment signature (HMAC SHA256) server-side, then
// updates the order's payment_status in Supabase using the SERVICE ROLE key
// (bypasses RLS safely — this key never reaches the browser).

const crypto = require('crypto');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!RAZORPAY_KEY_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not fully configured.' }) };
  }

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = JSON.parse(event.body);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Verify signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret) must equal razorpay_signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Payment verification failed — signature mismatch.' }) };
    }

    // Signature valid — mark the order as paid in Supabase via service role key
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        payment_status: 'paid',
        payment_method: 'razorpay',
        razorpay_order_id,
        razorpay_payment_id,
        status: 'confirmed'
      })
    });

    if (!updateResponse.ok) {
      const errText = await updateResponse.text();
      return { statusCode: 500, body: JSON.stringify({ error: 'Payment verified but failed to update order: ' + errText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
