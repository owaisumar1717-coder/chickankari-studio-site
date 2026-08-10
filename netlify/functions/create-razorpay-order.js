// netlify/functions/create-razorpay-order.js
// Creates a Razorpay order. Called by the browser right before opening the
// Razorpay Checkout widget. Uses RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET from
// Netlify environment variables — these must NEVER be placed in frontend code.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Razorpay keys not configured on server.' }) };
  }

  try {
    const { amount, receipt } = JSON.parse(event.body);

    if (!amount || amount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) };
    }

    const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Razorpay expects paise
        currency: 'INR',
        receipt: receipt || `order_${Date.now()}`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error?.description || 'Razorpay order creation failed' }) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        razorpay_order_id: data.id,
        amount: data.amount,
        currency: data.currency,
        key_id: RAZORPAY_KEY_ID // safe to return — this is the public key, not the secret
      })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
