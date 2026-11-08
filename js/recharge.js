(function () {
  const C = window.AEGIS_CONFIG && window.AEGIS_CONFIG.recharge;
  const $ = id => document.getElementById(id);
  const form = $('rc-form');
  if (!C || !form) return;
  if (!C.enabled) { form.classList.add('hidden'); $('rc-closed').classList.remove('hidden'); return; }

  const banner = $('rc-banner');
  if (new URLSearchParams(location.search).get('recharge') === 'done') { banner.textContent = t('rc_done_msg'); banner.classList.remove('hidden'); }

  let data = null, token = '';
  const php = n => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const showError = key => { const e = $('rc-error'); e.textContent = t(key); e.classList.remove('hidden'); };
  const current = () => data && data.packages.find(p => p.id === $('rc-package').value);

  function renderTotal() {
    const p = current();
    $('rc-total').textContent = p ? php(p.usdt * data.rate) : '₱0.00';
    $('rc-usdt').textContent = (p ? p.usdt.toFixed(2) : '0.00') + ' USDT';
    $('rc-rate').textContent = data ? `1 USDT ≈ ${php(data.rate)}` : '';
  }
  function renderOptions() {
    if (!data) return;
    const sel = $('rc-package'), keep = sel.value;
    sel.replaceChildren(new Option(t('rc_choose'), ''), ...data.packages.map(p => new Option(`${p.cash} GAME CASH - ${p.usdt} USDT`, p.id)));
    sel.value = keep; renderTotal();
  }
  async function loadRate() {
    try { const r = await fetch('/api/rate'); if (!r.ok) throw 0; data = await r.json(); renderOptions(); }
    catch (e) { if (!data) showError('rc_err_load'); }
  }
  loadRate(); setInterval(loadRate, 60000);
  document.addEventListener('langchange', renderOptions);
  $('rc-package').addEventListener('change', renderTotal);

  if (C.turnstileSiteKey) {
    window.onTurnstileLoad = () => turnstile.render('#rc-turnstile', { sitekey: C.turnstileSiteKey, theme: 'dark', callback: v => { token = v; } });
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad'; s.async = true;
    document.head.append(s);
  }

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    $('rc-error').classList.add('hidden');
    const username = $('rc-username').value.trim(), email = $('rc-email').value.trim();
    if (!current()) return showError('rc_err_pkg');
    if (!/^[A-Za-z0-9_]{4,20}$/.test(username)) return showError('rc_err_username');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('rc_err_email');
    if (!$('rc-terms').checked) return showError('rc_err_terms');
    if (C.turnstileSiteKey && !token) return showError('rc_err_captcha');
    const btn = $('rc-submit'); btn.disabled = true;
    try {
      const r = await fetch('/api/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: current().id, username, email, terms: true, turnstile: token }) });
      const j = await r.json();
      if (r.ok && typeof j.url === 'string' && j.url.startsWith('https://')) { location.href = j.url; return; }
      showError('rc_err_net');
      if (j.detail) $('rc-error').textContent += ' [' + j.detail + ']';
    } catch (e) { showError('rc_err_net'); }
    btn.disabled = false;
    if (window.turnstile) { turnstile.reset(); token = ''; }
  });
})();
