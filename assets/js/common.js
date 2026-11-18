// Current language + translation lookup (keeps JS-set button text in the chosen language)
let currentLang = 'en';
function tr(key, fallback) {
    return (typeof translations !== 'undefined' && translations[currentLang] && translations[currentLang][key]) || fallback;
}

// Mobile Navigation Menu Toggle
const menuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    document.querySelectorAll('#mobile-menu a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}

// Language Dropdown Toggle and Selection
const langBtn = document.getElementById('lang-menu-btn');
const langDropdown = document.getElementById('lang-dropdown');
const currentLangSpan = document.getElementById('current-lang');

if (langBtn && langDropdown) {
    langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langDropdown.classList.toggle('hidden');
    });

    window.addEventListener('click', () => {
        if (!langDropdown.classList.contains('hidden')) {
            langDropdown.classList.add('hidden');
        }
    });
}

function setLanguage(lang) {
    currentLang = lang;
    try { localStorage.setItem('aegis_lang', lang); } catch (e) {}
    const langCodes = {
        en: 'EN',
        pt: 'PT',
        zh: 'ZH',
        ph: 'PH',
        id: 'ID',
        th: 'TH',
        vi: 'VN',
        ru: 'RU',
        ko: 'KO'
    };

    if (currentLangSpan) {
        currentLangSpan.innerText = langCodes[lang] || 'EN';
    }

    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });

    if (langDropdown) {
        langDropdown.classList.add('hidden');
    }
}

// Restore the language chosen on another page
try {
    const savedLang = localStorage.getItem('aegis_lang');
    if (savedLang && savedLang !== 'en' && translations[savedLang]) setLanguage(savedLang);
} catch (e) {}
