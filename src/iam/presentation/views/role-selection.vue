<script setup>
import PvButton from 'primevue/button';
import PvMessage from 'primevue/message';

import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const router = useRouter();
const { t } = useI18n();
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

      <pv-message severity="info" :closable="false" class="mb-4">
        {{ t('iam.simulation-note') }}
      </pv-message>

      <div class="role-options">
        <div class="role-card">
          <div class="icon-wrap buyer"><i class="pi pi-building"/></div>
          <h3>{{ t('iam.buyer-title') }}</h3>
          <p>{{ t('iam.buyer-desc') }}</p>
        </div>

        <div class="role-card">
          <div class="icon-wrap provider"><i class="pi pi-truck"/></div>
          <h3>{{ t('iam.provider-title') }}</h3>
          <p>{{ t('iam.provider-desc') }}</p>
        </div>
      </div>

      <div class="actions">
        <pv-button
            :label="t('iam.sign-in')"
            icon="pi pi-sign-in"
            class="action-btn"
            @click="router.push('/iam/login')"
        />
        <pv-button
            :label="t('iam.create-account')"
            icon="pi pi-user-plus"
            outlined
            class="action-btn"
            @click="router.push('/iam/register')"
        />
      </div>

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
  width: 100%; max-width: 600px; box-shadow: 0 20px 50px rgba(0,0,0,.25);
}
.iam-brand { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.iam-logo { height: 52px; object-fit: contain; }
.iam-title { font-size: 1.8rem; font-weight: 800; color: #1e3a8a; margin: 0; }
.iam-subtitle { font-size: .9rem; color: #64748b; margin: 2px 0 0; }
.mb-4 { margin-bottom: 1.5rem; }

.role-options { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.role-card {
  border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.25rem;
  background: #f8fafc; display: flex; flex-direction: column; gap: .5rem;
}
.role-card h3 { margin: 0; font-size: 1rem; color: #1a2744; font-weight: 700; }
.role-card p { margin: 0; font-size: .8rem; color: #64748b; line-height: 1.4; }
.icon-wrap {
  width: 42px; height: 42px; border-radius: 10px; display: flex;
  align-items: center; justify-content: center; font-size: 1.2rem;
}
.icon-wrap.buyer { background: #e8f0fd; color: #2563eb; }
.icon-wrap.provider { background: #e6f7f1; color: #059669; }

.actions { display: flex; flex-direction: column; gap: 10px; margin-top: 1rem; }
.action-btn { width: 100%; justify-content: center; }

@media (max-width: 540px) {
  .role-options { grid-template-columns: 1fr; }
  .iam-screen { padding: 1rem; }
  .iam-card { padding: 1.25rem; }
}
</style>
