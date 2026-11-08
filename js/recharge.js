(function () {
  const C = window.AEGIS_CONFIG && window.AEGIS_CONFIG.recharge;
  const $ = id => document.getElementById(id);
  const form = $('rc-form');
  if (!C || !form) return;
  if (!C.enabled) { form.classList.add('hidden'); $('rc-closed').classList.remove('hidden'); return; }

  const sel = { pkg: null, pay: null };
  const fmt = n => Number(n).toLocaleString('en-US');

  function option(group, id, fill) {
    const label = document.createElement('label');
    label.className = 'cursor-pointer block';
    const r = document.createElement('input');
    r.type = 'radio'; r.name = group; r.value = id; r.className = 'sr-only peer';
    r.checked = sel[group] === id;
    r.addEventListener('change', () => { sel[group] = id; });
    const box = document.createElement('div');
    box.className = 'h-full border border-gray-700 hover:border-brand-gold/60 peer-checked:border-brand-gold peer-checked:bg-brand-gold/10 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-gold rounded-xl p-4 text-center transition-all';
    fill(box);
    label.append(r, box);
    return label;
  }
  function line(cls, text) { const d = document.createElement('div'); d.className = cls; d.textContent = text; return d; }

  function render() {
    const pk = $('rc-packages'), pm = $('rc-methods');
    pk.replaceChildren(...C.packages.map(p => option('pkg', p.id, b => {
      b.append(line('font-heading font-bold text-white', t('rc_coins', { coins: fmt(p.coins) })));
      if (p.bonus) b.append(line('text-xs text-brand-gold mt-1', t('rc_bonus', { bonus: fmt(p.bonus) })));
      b.append(line('text-sm text-gray-400 mt-2', C.currency + fmt(p.price)));
    })));
    pm.replaceChildren(...C.methods.map(m => option('pay', m.id, b => b.append(line('font-heading font-bold text-white text-sm', m.name)))));
  }
  render();
  document.addEventListener('langchange', render);

  function showError(key) { const e = $('rc-error'); e.textContent = t(key); e.classList.remove('hidden'); }

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    $('rc-error').classList.add('hidden');
    const account = $('rc-account').value.trim();
    const pkg = C.packages.find(p => p.id === sel.pkg);
    const pay = C.methods.find(m => m.id === sel.pay);
    if (!/^[A-Za-z0-9_]{4,20}$/.test(account)) return showError('rc_err_account');
    if (!pkg) return showError('rc_err_pkg');
    if (!pay) return showError('rc_err_pay');

    const ref = 'AEG-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    const order = { ref, account, packageId: pkg.id, method: pay.id };

    if (C.apiEndpoint) {
      const btn = $('rc-submit'); btn.disabled = true;
      try {
        const res = await fetch(C.apiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order), signal: AbortSignal.timeout(15000) });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error('bad response');
        if (typeof data.checkoutUrl === 'string' && data.checkoutUrl.startsWith('https://')) { location.href = data.checkoutUrl; return; }
      } catch (e) { btn.disabled = false; return showError('rc_err_net'); }
      btn.disabled = false;
    }
    showResult(order, pkg, pay);
  });

  let details = '';
  function showResult(o, pkg, pay) {
    const summary = `${o.account} · ${t('rc_coins', { coins: fmt(pkg.coins + (pkg.bonus || 0)) })} · ${C.currency}${fmt(pkg.price)} · ${pay.name}`;
    $('rc-ref').textContent = o.ref;
    $('rc-summary').textContent = summary;
    $('rc-pay').textContent = pay.account ? `${t('rc_send_to')}: ${pay.name} ${pay.account}` : t('rc_pay_discord');
    $('rc-discord').href = C.discord;
    details = `${o.ref} | ${summary}`;
    form.classList.add('hidden');
    $('rc-result').classList.remove('hidden');
  }
  $('rc-copy').addEventListener('click', async () => {
    const b = $('rc-copy');
    try { await navigator.clipboard.writeText(details); b.textContent = t('rc_copied'); setTimeout(() => { b.textContent = t('rc_copy'); }, 1500); } catch (e) {}
  });
  $('rc-again').addEventListener('click', () => {
    $('rc-result').classList.add('hidden'); form.classList.remove('hidden');
    form.reset(); sel.pkg = sel.pay = null; render();
  });
})();
