<script setup>
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <section class="home">
    <div class="home-copy">
      <h1>{{ t('home.title') }}</h1>
      <p>{{ t('home.content') }}</p>
    </div>
    <img class="home-image" src="/home-hero.png" :alt="t('home.title')" />
  </section>
</template>
