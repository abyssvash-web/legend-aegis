(function () {
  const C = window.AEGIS_CONFIG && window.AEGIS_CONFIG.register;
  const $ = id => document.getElementById(id);
  const form = $('reg-form');
  if (!C || !form) return;
  if (!C.enabled) { form.classList.add('hidden'); $('reg-closed').classList.remove('hidden'); return; }

  let token = '';
  const showError = key => { const e = $('reg-error'); e.textContent = t(key); e.classList.remove('hidden'); };

  if (C.turnstileSiteKey) {
    const render = () => turnstile.render('#reg-turnstile', { sitekey: C.turnstileSiteKey, theme: 'dark', callback: v => { token = v; } });
    if (window.turnstile) render();
    else {
      const prev = window.onTurnstileLoad;
      window.onTurnstileLoad = () => { if (prev) prev(); render(); };
      if (!document.querySelector('script[src*="turnstile/v0/api.js"]')) {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'; s.async = true;
        document.head.append(s);
      }
    }
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    $('reg-error').classList.add('hidden');
    const username = $('reg-username').value.trim(), email = $('reg-email').value.trim();
    const password = $('reg-password').value, password2 = $('reg-password2').value;
    if (!/^[A-Za-z0-9_]{4,20}$/.test(username)) return showError('rc_err_username');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('rc_err_email');
    if (password.length < 8 || password.length > 32) return showError('reg_err_password');
    if (password !== password2) return showError('reg_err_match');
    if (!$('reg-terms').checked) return showError('reg_err_terms');
    if (C.turnstileSiteKey && !token) return showError('rc_err_captcha');
    const btn = $('reg-submit'); btn.disabled = true;
    try {
      const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, terms: true, turnstile: token }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        form.reset();
        const ok = $('reg-success'); ok.textContent = t('reg_done'); ok.classList.remove('hidden');
        btn.disabled = false;
        if (window.turnstile) { turnstile.reset(); token = ''; }
        return;
      }
      const map = { username: 'rc_err_username', email: 'rc_err_email', password: 'reg_err_password', terms: 'reg_err_terms', captcha: 'rc_err_captcha', taken: 'reg_err_taken' };
      showError(map[j.error] || 'reg_err_net');
      if (j.detail) $('reg-error').textContent += ' [' + j.detail + ']';
    } catch (e) { showError('reg_err_net'); }
    btn.disabled = false;
    if (window.turnstile) { turnstile.reset(); token = ''; }
  });
})();
