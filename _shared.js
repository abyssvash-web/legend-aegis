// Server-side price list: the ONLY source of truth for prices. Add more packages here.
const PACKAGES = {
  c50: { cash: 50, usdt: 8 }
};
const HITPAY = () => process.env.HITPAY_ENV === 'sandbox' ? 'https://api.sandbox.hit-pay.com' : 'https://api.hit-pay.com';
const HEADERS = () => ({ 'X-BUSINESS-API-KEY': process.env.HITPAY_API_KEY || '', 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' });

// USDT is treated as 1 USD. Live USD->PHP rate, falls back to FALLBACK_USD_PHP (default 64).
async function getRate() {
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    const p = j && j.rates && j.rates.PHP;
    if (p > 0) return { rate: p, live: true };
  } catch (e) { /* use fallback */ }
  return { rate: Number(process.env.FALLBACK_USD_PHP) || 64, live: false };
}

async function discord(payload) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
  catch (e) { console.error('discord notify failed'); }
}

async function mail(to, subject, html) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return;
  try {
    await fetch('https://api.resend.com/emails', { method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, html }) });
  } catch (e) { console.error('mail failed'); }
}
// Minimal Supabase REST client (server-side only). Returns { skipped: true } if not configured.
async function db(path, method, body, prefer) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return { skipped: true };
  const r = await fetch(`${url}/rest/v1/${path}`, { method: method || 'GET',
    headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: 'Bearer ' + key } : {}), 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error('supabase ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 200));
  return { data: await r.json().catch(() => null) };
}
module.exports = { db, PACKAGES, HITPAY, HEADERS, getRate, discord, mail };
