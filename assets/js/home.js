// Download popup: show Coming Soon for Windows PC or Android.
function showDownloadComingSoon(platform) {
    const modal = document.getElementById('download-coming-soon-modal');
    const message = document.getElementById('download-modal-message');
    if (!modal || !message) return;
    message.textContent = `The ${platform} game download is coming soon. Please stay tuned for updates.`;
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

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeDownloadComingSoon();
});
