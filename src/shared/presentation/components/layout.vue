<script setup>
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './language-switcher.vue';

const { t } = useI18n();
</script>

<template>
  <div class="shell">
    <a class="skip-link" href="#main-content">{{ t('shared.skip') }}</a>
    <header class="topbar">
      <router-link class="brand" to="/" aria-label="FullTank">
        <img src="/fulltank-logo.png" alt="" width="40" height="40" />
        <span>FullTank</span>
      </router-link>
      <div class="topbar-actions">
        <span class="demo-badge">{{ t('shared.demo') }}</span>
        <LanguageSwitcher />
      </div>
    </header>
    <main id="main-content" tabindex="-1">
      <router-view />
    </main>
    <footer>{{ t('footer.simulation-disclaimer') }}</footer>
  </div>
</template>
