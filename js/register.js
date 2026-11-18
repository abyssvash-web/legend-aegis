(function () {
  const C = window.AEGIS_CONFIG && window.AEGIS_CONFIG.register;
  const $ = id => document.getElementById(id);
  const form = $('reg-form');
  if (!C || !form) return;
  if (!C.enabled) { form.classList.add('hidden'); $('reg-closed').classList.remove('hidden'); return; }

  let token = '', timer = null;
  const showError = key => { const e = $('reg-error'); e.textContent = t(key); e.classList.remove('hidden'); };
  const clearError = () => $('reg-error').classList.add('hidden');
  const emailLocal = () => $('reg-email').value.trim();
  const emailValid = () => /^[A-Za-z0-9._+-]{1,64}$/.test(emailLocal());
  const resetCaptcha = () => { if (window.turnstile) { try { turnstile.reset(); } catch (e) {} } token = ''; };

  // Show / hide password
  form.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => {
    const i = $(b.dataset.toggle), show = i.type === 'password';
    i.type = show ? 'text' : 'password';
    b.firstElementChild.className = 'fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye');
  }));

  // Cloudflare Turnstile (checked when sending the email code)
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

  // Send code (60s cooldown)
  const sendBtn = $('reg-send');
  function cooldown(sec) {
    clearInterval(timer);
    sendBtn.disabled = true;
    const tick = () => {
      if (sec <= 0) { clearInterval(timer); sendBtn.disabled = false; sendBtn.textContent = t('reg_send'); return; }
      sendBtn.textContent = sec + 's'; sec--;
    };
    tick(); timer = setInterval(tick, 1000);
  }
  document.addEventListener('langchange', () => { if (!sendBtn.disabled) sendBtn.textContent = t('reg_send'); });

  sendBtn.addEventListener('click', async () => {
    clearError();
    if (!emailValid()) return showError('reg_err_email');
    if (C.turnstileSiteKey && !token) return showError('rc_err_captcha');
    sendBtn.disabled = true;
    try {
      const r = await fetch('/api/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLocal() + '@' + $('reg-domain').value, turnstile: token }) });
      const j = await r.json().catch(() => ({}));
      resetCaptcha();
      if (r.ok) {
        const ok = $('reg-success'); ok.textContent = t('reg_sent'); ok.classList.remove('hidden');
        return cooldown(60);
      }
      const map = { email: 'reg_err_email', captcha: 'rc_err_captcha', taken: 'reg_err_taken', wait: 'reg_err_wait' };
      showError(map[j.error] || 'reg_err_send');
      if (j.detail) $('reg-error').textContent += ' [' + j.detail + ']';
      if (j.error === 'wait') return cooldown(60);
    } catch (e) { showError('reg_err_send'); resetCaptcha(); }
    sendBtn.disabled = false;
  });

  // Create account
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    clearError(); $('reg-success').classList.add('hidden');
    const username = $('reg-username').value.trim(), password = $('reg-password').value;
    const question = $('reg-question').value, answer = $('reg-answer').value.trim(), code = $('reg-code').value.trim();
    if (!/^[A-Za-z0-9]{6,10}$/.test(username)) return showError('reg_err_username');
    if (password.length < 6 || password.length > 14) return showError('reg_err_password');
    if (password !== $('reg-password2').value) return showError('reg_err_match');
    if (!question) return showError('reg_err_question');
    if (answer.length < 2 || answer.length > 50) return showError('reg_err_answer');
    if (!emailValid()) return showError('reg_err_email');
    if (!/^\d{6}$/.test(code)) return showError('reg_err_code');
    const btn = $('reg-submit'); btn.disabled = true;
    try {
      const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, question, answer, email: emailLocal() + '@' + $('reg-domain').value, code }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        form.reset(); clearInterval(timer); sendBtn.disabled = false; sendBtn.textContent = t('reg_send'); resetCaptcha();
        const ok = $('reg-success'); ok.textContent = t('reg_done'); ok.classList.remove('hidden');
        $('register').scrollIntoView();
      } else {
        const map = { username: 'reg_err_username', password: 'reg_err_password', question: 'reg_err_question', answer: 'reg_err_answer',
          email: 'reg_err_email', code: 'reg_err_code', badcode: 'reg_err_badcode', taken: 'reg_err_taken' };
        showError(map[j.error] || 'reg_err_net');
        if (j.detail) $('reg-error').textContent += ' [' + j.detail + ']';
      }
    } catch (e) { showError('reg_err_net'); }
    btn.disabled = false;
  });
})();
