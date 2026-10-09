<script setup>
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './language-switcher.vue';
import { useRouter } from 'vue-router';
import useIamStore from '../../../iam/application/iam.store.js';
import pinia from '../../../pinia.js';

const { t } = useI18n();
const iam = useIamStore(pinia);
const router = useRouter();
function logout() {
    iam.logout();
    router.push('/');
}
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
        <router-link v-if="!iam.isAuthenticated" to="/iam/login">{{ t('iam.sign-in') }}</router-link>
        <template v-else>
          <router-link to="/iam/profile">{{ t('iam.profile-title') }}</router-link>
          <button type="button" class="logout-button" @click="logout">{{ t('iam.logout') }}</button>
        </template>
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

<style scoped>
.logout-button { border: 1px solid #cbd5e1; border-radius: .5rem; padding: .55rem; background: white; color: #334155; }
@media (max-width: 600px) {
  .topbar-actions { flex-wrap: wrap; justify-content: flex-end; }
}
</style>
