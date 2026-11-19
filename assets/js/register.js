// Toggle password visibility
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Alert helper
function showRegAlert(type, message) {
    const box = document.getElementById('reg-alert');
    const icon = document.getElementById('reg-alert-icon');
    const text = document.getElementById('reg-alert-text');
    if (!box || !icon || !text) return;

    box.className = 'mb-6 p-4 rounded-xl text-sm font-medium flex items-start gap-3 border';
    icon.className = 'fa-solid mt-0.5 text-base';

    if (type === 'success') {
        box.classList.add('bg-emerald-950/70', 'border-emerald-500/50', 'text-emerald-300');
        icon.classList.add('fa-circle-check', 'text-emerald-400');
    } else {
        box.classList.add('bg-red-950/70', 'border-red-500/50', 'text-red-300');
        icon.classList.add('fa-circle-exclamation', 'text-red-400');
    }

    text.textContent = message;
    box.classList.remove('hidden');
}

function hideRegAlert() {
    const box = document.getElementById('reg-alert');
    if (box) box.classList.add('hidden');
}

// Build full email from prefix + dropdown domain
function getFullEmail() {
    const prefixInput = document.getElementById('email-prefix');
    const domainSelect = document.getElementById('email-domain');
    let prefix = (prefixInput ? prefixInput.value : '').trim();
    const domain = domainSelect ? domainSelect.value : '@gmail.com';

    if (!prefix) return '';
    // If user accidentally typed "@gmail.com" inside the prefix box, strip it
    if (prefix.includes('@')) {
        prefix = prefix.split('@')[0].trim();
    }
    if (!prefix) return '';
    return `${prefix}${domain}`;
}

// Send Verification Code Handler
const sendCodeBtn = document.getElementById('send-code-btn');
const sendCodeText = document.getElementById('send-code-text');
let cooldownTimer = null;

function startSendCodeCooldown(seconds = 60) {
    if (!sendCodeBtn || !sendCodeText) return;
    sendCodeBtn.disabled = true;
    let remaining = seconds;
    sendCodeText.textContent = `${remaining}s`;

    clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(cooldownTimer);
            sendCodeBtn.disabled = false;
            sendCodeText.textContent = tr('btn_send_code', 'Send Code');
        } else {
            sendCodeText.textContent = `${remaining}s`;
        }
    }, 1000);
}

// Aegis session cookie returned by send_code, sent back on register
let aegisSess = '';

if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', async () => {
        hideRegAlert();
        const email = getFullEmail();

        if (!email) {
            showRegAlert('error', 'Please enter your email username first.');
            document.getElementById('email-prefix')?.focus();
            return;
        }

        sendCodeBtn.disabled = true;
        sendCodeText.textContent = 'Sending...';

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game: 'AEGIS',
                    action: 'send_code',
                    email
                })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && data.ok) {
                aegisSess = data.sess || '';
                showRegAlert('success', 'Code sent. Please check your inbox');
                startSendCodeCooldown(60);
            } else {
                showRegAlert('error', data.message || 'Failed to send verification code.');
                sendCodeBtn.disabled = false;
                sendCodeText.textContent = tr('btn_send_code', 'Send Code');
            }
        } catch (err) {
            showRegAlert('error', 'Network error while sending verification code.');
            sendCodeBtn.disabled = false;
            sendCodeText.textContent = tr('btn_send_code', 'Send Code');
        }
    });
}

// Form Submit Handler
const regForm = document.getElementById('aegis-register-form');
const submitRegBtn = document.getElementById('submit-reg-btn');
const submitRegText = document.getElementById('submit-reg-text');

if (regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideRegAlert();

        const account = document.getElementById('account').value.trim();
        const password = document.getElementById('password').value;
        const password2 = document.getElementById('password2').value;
        const question = document.getElementById('question').value;
        const answer = document.getElementById('answer').value.trim();
        const email = getFullEmail();
        const ecode = document.getElementById('ecode').value.trim();

        if (!/^[A-Za-z0-9]{6,10}$/.test(account)) {
            showRegAlert('error', 'Account must be 6-10 letters or numbers.');
            return;
        }
        if (password.length < 6 || password.length > 14) {
            showRegAlert('error', 'Password must be 6-14 characters.');
            return;
        }
        if (password !== password2) {
            showRegAlert('error', 'Passwords do not match.');
            return;
        }
        if (!question) {
            showRegAlert('error', 'Please select a security question.');
            return;
        }
        if (!answer) {
            showRegAlert('error', 'Please enter your security answer.');
            return;
        }
        if (!email) {
            showRegAlert('error', 'Please enter your email address.');
            return;
        }
        if (!ecode) {
            showRegAlert('error', 'Please enter the email verification code.');
            return;
        }

        const tsInput = regForm.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = tsInput ? tsInput.value : '';
        if (!turnstileToken) {
            showRegAlert('error', 'Please complete the captcha verification.');
            return;
        }

        submitRegBtn.disabled = true;
        submitRegText.textContent = 'Registering...';

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    game: 'AEGIS',
                    action: 'register',
                    account,
                    password,
                    password2,
                    question,
                    answer,
                    email,
                    ecode,
                    sess: aegisSess,
                    turnstileToken
                })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && data.ok) {
                showRegAlert('success', 'Account registered successfully! You can now log in to Legend Aegis.');
                regForm.reset();
            } else {
                showRegAlert('error', data.message || 'Registration failed. Please check your details and try again.');
            }
        } catch (err) {
            showRegAlert('error', 'Network error while submitting registration.');
        } finally {
            if (window.turnstile) window.turnstile.reset();
            submitRegBtn.disabled = false;
            submitRegText.textContent = tr('btn_submit_reg', 'Register Account');
        }
    });
}
