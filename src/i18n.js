import en from './locales/en.json';
import es from './locales/es.json';
import { createI18n } from "vue-i18n";

const i18n = createI18n({
    legacy: false,
    locale: 'en-US',
    fallbackLocale: 'en-US',
    messages: {
        'en-US': en,
        'es-419': es,
        'en': en,
        'es': es
    }
});

// Sync document lang attribute on startup
if (typeof document !== 'undefined') {
    document.documentElement.lang = 'en-US';
}

export function setLocale(newLocale) {
    const standardized = (newLocale === 'es' || newLocale === 'es-419') ? 'es-419' : 'en-US';
    i18n.global.locale.value = standardized;
    if (typeof document !== 'undefined') {
        document.documentElement.lang = standardized;
    }
    return standardized;
}

export default i18n;