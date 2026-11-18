const crypto = require('crypto');
const { db, discord } = require('./_shared');
const { codeHash } = require('./send-code');
// Set DEBUG_ERRORS=1 in Vercel to see technical details in the browser while testing. Remove it when live.
const fail = (res, code, error, detail) => res.status(code).json(detail && process.env.DEBUG_ERRORS === '1' ? { error, detail: String(detail).slice(0, 300) } : { error });
const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
const QUESTIONS = ['father', 'mother', 'favorite', 'game'];

// NOTE: passwords and security answers are stored as salted scrypt hashes, never plain text.
// If your game server expects a specific hash (MD5, SHA, etc.), change hash() to match it.
function hash(text) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(text, salt, 64).toString('hex')}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'method');
  const b = req.body || {};
  const username = String(b.username || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const answer = String(b.answer || '').trim().toLowerCase();
  const code = String(b.code || '').trim();
  const [local, domain] = email.split('@');
  if (!/^[A-Za-z0-9]{6,10}$/.test(username)) return fail(res, 400, 'username');
  if (password.length < 6 || password.length > 14) return fail(res, 400, 'password');
  if (!QUESTIONS.includes(b.question)) return fail(res, 400, 'question');
  if (answer.length < 2 || answer.length > 50) return fail(res, 400, 'answer');
  if (!local || !/^[a-z0-9._+-]{1,64}$/.test(local) || !DOMAINS.includes(domain)) return fail(res, 400, 'email');
  if (!/^\d{6}$/.test(code)) return fail(res, 400, 'code');

  try {
    // 1) verify the emailed code (max 5 tries, 10 min expiry, single use)
    const q = encodeURIComponent(email);
    const found = await db(`email_codes?email=eq.${q}&select=*&limit=1`);
    if (found.skipped) return fail(res, 500, 'server', 'database not configured');
    const row = found.data && found.data[0];
    if (!row || new Date(row.expires_at) < new Date() || row.attempts >= 5) return fail(res, 400, 'badcode');
    const a = Buffer.from(codeHash(email, code)), c = Buffer.from(row.code_hash);
    if (a.length !== c.length || !crypto.timingSafeEqual(a, c)) {
      await db(`email_codes?email=eq.${q}`, 'PATCH', { attempts: row.attempts + 1 }, 'return=minimal');
      return fail(res, 400, 'badcode');
    }
    // 2) create the account (unique username/email enforced by the database)
    try {
      await db('accounts', 'POST', { username, email, password_hash: hash(password), security_question: b.question, security_answer_hash: hash(answer) }, 'return=minimal');
    } catch (e) {
      if (/ 409 |23505/.test(e.message)) return fail(res, 409, 'taken');
      throw e;
    }
    await db(`email_codes?email=eq.${q}`, 'DELETE', null, 'return=minimal').catch(() => {});
  } catch (e) { console.error(e.message); return fail(res, 500, 'server', e.message); }
  await discord({ content: `New account registered: ${username}` });
  return res.status(200).json({ ok: true });
};
