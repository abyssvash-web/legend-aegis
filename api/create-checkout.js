const crypto = require('crypto');
const { db, PACKAGES, HITPAY, HEADERS, getRate } = require('./_shared');
// Set DEBUG_ERRORS=1 in Vercel to see technical details in the browser while testing. Remove it when live.
const fail = (res, code, error, detail) => res.status(code).json(detail && process.env.DEBUG_ERRORS === '1' ? { error, detail: String(detail).slice(0, 300) } : { error });

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'method');
  const b = req.body || {};
  const username = String(b.username || '').trim();
  const email = String(b.email || '').trim();
  const pkg = PACKAGES[b.packageId];
  if (!pkg) return fail(res, 400, 'package');
  if (!/^[A-Za-z0-9_]{4,20}$/.test(username)) return fail(res, 400, 'username');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'email');
  if (b.terms !== true) return fail(res, 400, 'terms');

  if (process.env.TURNSTILE_SECRET) {
    try {
      const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: String(b.turnstile || '') }) });
      if (!(await v.json()).success) return fail(res, 400, 'captcha');
    } catch (e) { return fail(res, 502, 'captcha'); }
  }

  const { rate } = await getRate();
  const amount = (pkg.usdt * rate).toFixed(2);
  const ref = `AEG-${crypto.randomBytes(4).toString('hex').toUpperCase()}.${pkg.cash}.${username}`;
  const site = process.env.SITE_URL || `https://${req.headers.host}`;
  try {
    const r = await fetch(HITPAY() + '/v1/payment-requests', { method: 'POST', headers: HEADERS(), body: JSON.stringify({
      amount, currency: process.env.HITPAY_CURRENCY || 'PHP', email, send_email: true, reference_number: ref,
      purpose: `${pkg.cash} Game Cash for ${username}`, redirect_url: `${site}/?recharge=done#recharge` }) });
    const j = await r.json();
    if (!r.ok || typeof j.url !== 'string') { console.error('hitpay error', r.status, JSON.stringify(j).slice(0, 300)); return fail(res, 502, 'gateway', `hitpay ${r.status} ${JSON.stringify(j)}`); }
    try {
      await db('orders', 'POST', { ref: ref.split('.')[0], username, email, package_id: b.packageId, game_cash: pkg.cash,
        usdt: pkg.usdt, php_amount: amount, usd_php_rate: rate, hitpay_request_id: j.id }, 'return=minimal');
    } catch (e) { console.error(e.message); return fail(res, 500, 'order', e.message); }
    return res.status(200).json({ url: j.url });
  } catch (e) { return fail(res, 502, 'gateway', 'hitpay request failed: ' + e.message); }
};
