<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { setLocale } from "../../i18n.js";

const { locale } = useI18n();

const languageOptions = [
  { label: 'EN', value: 'en-US' },
  { label: 'ES', value: 'es-419' },
];

const selectedLang = computed({
  get: () => (locale.value === 'es' || locale.value === 'es-419' ? 'es-419' : 'en-US'),
  set: (val) => setLocale(val),
});
</script>

<template>
  <pv-select-button v-model="selectedLang" :options="languageOptions" option-label="label" option-value="value" :allow-empty="false" />
</template>

<style scoped>
</style>