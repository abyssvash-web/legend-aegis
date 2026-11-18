const crypto = require('crypto');
const { db, discord } = require('./_shared');
// Set DEBUG_ERRORS=1 in Vercel to see technical details in the browser while testing. Remove it when live.
const fail = (res, code, error, detail) => res.status(code).json(detail && process.env.DEBUG_ERRORS === '1' ? { error, detail: String(detail).slice(0, 300) } : { error });

// NOTE: passwords are stored as a salted scrypt hash, never plain text.
// If your game server expects a specific hash (MD5, SHA, etc.), change hashPassword() to match it.
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'method');
  const b = req.body || {};
  const username = String(b.username || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!/^[A-Za-z0-9_]{4,20}$/.test(username)) return fail(res, 400, 'username');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'email');
  if (password.length < 8 || password.length > 32) return fail(res, 400, 'password');
  if (b.terms !== true) return fail(res, 400, 'terms');

  if (process.env.TURNSTILE_SECRET) {
    try {
      const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: String(b.turnstile || '') }) });
      if (!(await v.json()).success) return fail(res, 400, 'captcha');
    } catch (e) { return fail(res, 502, 'captcha'); }
  }

  try {
    const r = await db('accounts', 'POST', { username, email, password_hash: hashPassword(password) }, 'return=minimal');
    if (r.skipped) return fail(res, 500, 'server', 'database not configured');
  } catch (e) {
    console.error(e.message);
    if (/ 409 |23505/.test(e.message)) return fail(res, 409, 'taken');
    return fail(res, 500, 'server', e.message);
  }
  await discord({ content: `New account registered: ${username}` });
  return res.status(200).json({ ok: true });
};
