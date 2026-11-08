(function () {
  const D = window.AEGIS_I18N || {};
  const codes = { en: 'EN', pt: 'PT', zh: 'ZH', ph: 'PH', id: 'ID', th: 'TH', vi: 'VN', ru: 'RU', ko: 'KO' };
  let cur = 'en';
  function t(key, vars) {
    let s = (D[cur] && D[cur][key]) || (D.en && D.en[key]) || key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  function setLanguage(lang) {
    if (!D[lang]) lang = 'en';
    cur = lang;
    document.documentElement.lang = lang === 'ph' ? 'fil' : lang;
    const label = document.getElementById('current-lang');
    if (label) label.textContent = codes[lang];
    document.querySelectorAll('[data-lang]').forEach(a => {
      const on = a.dataset.lang === lang;
      a.classList.toggle('text-brand-gold', on);
      a.classList.toggle('text-gray-300', !on);
      a.classList.toggle('font-bold', on);
    });
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    try { localStorage.setItem('aegis_lang', lang); } catch (e) {}
    const dd = document.getElementById('lang-dropdown');
    if (dd) dd.classList.add('hidden');
    document.dispatchEvent(new CustomEvent('langchange'));
  }
  window.t = t;
  window.setLanguage = setLanguage;
  let saved = null;
  try { saved = localStorage.getItem('aegis_lang'); } catch (e) {}
  setLanguage(saved || 'en');
})();
