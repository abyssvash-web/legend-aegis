// Frontend settings. Prices live on the server (api/_shared.js).
window.AEGIS_CONFIG = {
  recharge: {
    enabled: true,
    turnstileSiteKey: '' // Cloudflare Turnstile site key (public). Empty = no captcha.
  }
};
