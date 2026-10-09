import { createI18n } from 'vue-i18n';
import en from './locales/en.json';
import es from './locales/es.json';

const i18n = createI18n({
    legacy: false,
    locale: 'es-419',
    fallbackLocale: 'en-US',
    messages: { 'es-419': es, 'en-US': en, es, en },
});

export function setLocale(value) {
    const locale = value === 'es' || value === 'es-419' ? 'es-419' : 'en-US';
    i18n.global.locale.value = locale;
    if (typeof document !== 'undefined') document.documentElement.lang = locale;
    return locale;
}

setLocale('es-419');
export default i18n;
