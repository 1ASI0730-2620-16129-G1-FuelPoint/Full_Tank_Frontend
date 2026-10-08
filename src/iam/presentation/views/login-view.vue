<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import useIamStore from '../../application/iam.store.js';
import pinia from '../../../pinia.js';

const router = useRouter();
const { t } = useI18n();
const iamStore = useIamStore(pinia);

const email = ref('');
const password = ref('');
const errorKey = ref(null);
const isDemo = import.meta.env?.VITE_USE_FAKE_API === 'true';
const demoAccounts = {
  buyer: 'logistics@transportesdelsur.com',
  provider: 'dispatch@petroandes.com',
  pass: '123456',
};

async function submit() {
  errorKey.value = null;
  if (!email.value || !password.value) {
    errorKey.value = 'iam.required';
    return;
  }
  try {
    await iamStore.login(email.value.trim(), password.value);
    router.push('/dashboard');
  } catch (e) {
    errorKey.value = e.message || 'iam.invalid-credentials';
  }
}
</script>

<template>
  <div class="iam-screen">
    <div class="iam-card">
      <div class="iam-brand">
        <img src="/fulltank-logo.png" alt="FullTank" class="iam-logo"/>
        <div>
          <h1 class="iam-title">FullTank</h1>
          <p class="iam-subtitle">{{ t('iam.subtitle') }}</p>
        </div>
      </div>

      <h2 class="iam-heading">{{ t('iam.login-title') }}</h2>
      <p class="iam-prompt">{{ t('iam.login-subtitle') }}</p>

      <form class="iam-form" @submit.prevent="submit">
        <label class="field">
          <span class="field-label">{{ t('iam.email') }}</span>
          <pv-input-text v-model="email" type="email" autocomplete="email" :placeholder="t('iam.email')"/>
        </label>

        <label class="field">
          <span class="field-label">{{ t('iam.password') }}</span>
          <pv-input-text v-model="password" type="password" autocomplete="current-password" :placeholder="t('iam.password')"/>
        </label>

        <pv-message v-if="errorKey" severity="error" :closable="false" class="iam-error">
          {{ t(errorKey) }}
        </pv-message>

        <pv-message v-if="isDemo" severity="info" :closable="false" class="iam-error">
          {{ t('iam.demo-hint', demoAccounts) }}
        </pv-message>

        <pv-button
            type="submit"
            :label="t('iam.sign-in')"
            icon="pi pi-sign-in"
            class="iam-submit"
            :loading="iamStore.loading"
        />
      </form>

      <p class="iam-switch">
        {{ t('iam.no-account') }}
        <router-link to="/iam/register">{{ t('iam.create-account') }}</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.iam-screen {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
  padding: 2rem; font-family: 'Inter', sans-serif;
}
.iam-card {
  background: #fff; border-radius: 18px; padding: 2.5rem;
  width: 100%; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,.25);
}
.iam-brand { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.iam-logo { height: 48px; object-fit: contain; }
.iam-title { font-size: 1.6rem; font-weight: 800; color: #1e3a8a; margin: 0; }
.iam-subtitle { font-size: .82rem; color: #64748b; margin: 2px 0 0; }
.iam-heading { font-size: 1.35rem; font-weight: 700; color: #1a2744; margin: .5rem 0 .25rem; }
.iam-prompt { font-size: .92rem; color: #64748b; margin: 0 0 1.25rem; }

.iam-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: .35rem; }
.field-label { font-size: .8rem; font-weight: 600; color: #475569; }
.field :deep(.p-inputtext) { width: 100%; }

.iam-error { margin: 0; }
.iam-submit { margin-top: .5rem; width: 100%; justify-content: center; }

.iam-switch { margin-top: 1.25rem; font-size: .88rem; color: #64748b; text-align: center; }
.iam-switch a { color: #2563eb; font-weight: 600; text-decoration: none; }
</style>
