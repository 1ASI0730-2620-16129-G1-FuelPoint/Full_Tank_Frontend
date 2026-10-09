import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Material from '@primeuix/themes/material';
import { definePreset } from '@primeuix/themes';
import 'primeflex/primeflex.css';
import 'primeicons/primeicons.css';
import './style.css';
import App from './App.vue';
import i18n from './i18n.js';
import router from './router.js';
import pinia from './pinia.js';

const FullTankTheme = definePreset(Material, {
    semantic: {
        primary: {
            50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
            400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
            800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
        },
    },
});

createApp(App)
    .use(pinia)
    .use(router)
    .use(i18n)
    .use(ToastService)
    .use(PrimeVue, { theme: { preset: FullTankTheme, options: { darkModeSelector: false } }, ripple: true })
    .mount('#app');
