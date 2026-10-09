<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <section class="not-found">
    <p class="error-code">404</p>
    <h1>{{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.content') }}</p>
    <router-link class="home-link" to="/">{{ t('notFound.back') }}</router-link>
  </section>
</template>
