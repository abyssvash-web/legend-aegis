const crypto = require('crypto');
const { db, mail } = require('./_shared');
const fail = (res, code, error, detail) => res.status(code).json(detail && process.env.DEBUG_ERRORS === '1' ? { error, detail: String(detail).slice(0, 300) } : { error });
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
const codeHash = (email, code) => crypto.createHash('sha256').update(`${process.env.CODE_SALT || 'aegis'}|${email}|${code}`).digest('hex');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'method');
  const b = req.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  const [local, domain] = email.split('@');
  if (!local || !/^[a-z0-9._+-]{1,64}$/.test(local) || !DOMAINS.includes(domain)) return fail(res, 400, 'email');

  if (process.env.TURNSTILE_SECRET) {
    try {
      const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
        body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: String(b.turnstile || '') }) });
      if (!(await v.json()).success) return fail(res, 400, 'captcha');
    } catch (e) { return fail(res, 502, 'captcha'); }
  }
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return fail(res, 500, 'server', 'email sending not configured (RESEND_API_KEY / MAIL_FROM)');

  try {
    const q = encodeURIComponent(email);
    const used = await db(`accounts?email=eq.${q}&select=id&limit=1`);
    if (used.skipped) return fail(res, 500, 'server', 'database not configured');
    if (used.data && used.data.length) return fail(res, 409, 'taken');
    const prev = await db(`email_codes?email=eq.${q}&select=created_at&limit=1`);
    if (prev.data && prev.data[0] && Date.now() - new Date(prev.data[0].created_at).getTime() < 60000) return fail(res, 429, 'wait');

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await db('email_codes?on_conflict=email', 'POST', { email, code_hash: codeHash(email, code), attempts: 0,
      created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 10 * 60000).toISOString() },
      'resolution=merge-duplicates,return=minimal');
    await mail(email, 'Your Legend Aegis verification code',
      `<p>Your Legend Aegis verification code is:</p><p style="font-size:28px;letter-spacing:4px"><b>${code}</b></p><p>It expires in 10 minutes. If you didn't request this, ignore this email.</p>`);
    return res.status(200).json({ ok: true });
  } catch (e) { console.error(e.message); return fail(res, 500, 'server', e.message); }
};
module.exports.codeHash = codeHash;
