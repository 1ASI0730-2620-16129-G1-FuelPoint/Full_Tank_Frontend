<script setup>
import { useI18n } from 'vue-i18n';
import { setLocale } from '../../../i18n.js';

const { t, locale } = useI18n();
</script>

<template>
  <div class="language-switch" role="group" :aria-label="t('shared.language')">
    <button type="button" :aria-pressed="locale === 'es-419'" @click="setLocale('es-419')">ES</button>
    <button type="button" :aria-pressed="locale === 'en-US'" @click="setLocale('en-US')">EN</button>
  </div>
</template>
