// Frontend settings. Prices live on the server (api/_shared.js).
window.AEGIS_CONFIG = {
  recharge: {
    enabled: true,
    turnstileSiteKey: '0x4AAAAAAF43VBbXCP0wtNd2' // Cloudflare Turnstile site key (public). Empty = no captcha.
  }
};
