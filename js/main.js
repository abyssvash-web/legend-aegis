// Mobile menu
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.add('hidden')));
}
// Language dropdown
const langBtn = document.getElementById('lang-menu-btn');
const langDropdown = document.getElementById('lang-dropdown');
if (langBtn && langDropdown) {
  langBtn.addEventListener('click', e => { e.stopPropagation(); langDropdown.classList.toggle('hidden'); });
  window.addEventListener('click', () => langDropdown.classList.add('hidden'));
}
// Download "coming soon" popup
function showDownloadComingSoon(platform) {
  const modal = document.getElementById('download-coming-soon-modal');
  const msg = document.getElementById('download-modal-message');
  if (!modal || !msg) return;
  msg.textContent = t('dl_modal_msg', { platform });
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}
function closeDownloadComingSoon() {
  const modal = document.getElementById('download-coming-soon-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDownloadComingSoon(); });
