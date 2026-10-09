<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import useIamStore from '../../application/iam.store.js';
import pinia from '../../../pinia.js';

const router = useRouter();
const { t } = useI18n();
const iamStore = useIamStore(pinia);

const role = ref('BUYER');

// Company fields
const ruc = ref('');
const companyName = ref('');
const sector = ref(null);
const address = ref('');
const phone = ref('');
const description = ref('');

// Account credentials
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const errorKey = ref(null);

const isProvider = computed(() => role.value === 'PROVIDER');

const roleOptions = computed(() => [
  { label: t('iam.buyer-title'), value: 'BUYER' },
  { label: t('iam.provider-title'), value: 'PROVIDER' },
]);

const sectorOptions = computed(() => [
  { label: t('iam.sector-transport'), value: 'TRANSPORT' },
  { label: t('iam.sector-mining'), value: 'MINING' },
  { label: t('iam.sector-construction'), value: 'CONSTRUCTION' },
  { label: t('iam.sector-maritime'), value: 'MARITIME' },
  { label: t('iam.sector-logistics'), value: 'LOGISTICS' },
]);

function validate() {
  if (!companyName.value || !ruc.value || !address.value || !phone.value
      || !email.value || !password.value) {
    errorKey.value = 'iam.required';
    return false;
  }
  if (!isProvider.value && !sector.value) {
    errorKey.value = 'iam.required';
    return false;
  }
  if (password.value !== confirmPassword.value) {
    errorKey.value = 'iam.password-mismatch';
    return false;
  }
  return true;
}

async function submit() {
  errorKey.value = null;
  if (!validate()) return;
  try {
    await iamStore.register({
      role: role.value,
      email: email.value.trim(),
      password: password.value,
      ruc: ruc.value.trim(),
      companyName: companyName.value.trim(),
      sector: sector.value,
      address: address.value.trim(),
      phone: phone.value.trim(),
      description: description.value.trim(),
    });
    router.push('/dashboard');
  } catch (e) {
    errorKey.value = e.message || 'iam.user-failed';
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

      <h2 class="iam-heading">{{ t('iam.register-title') }}</h2>
      <p class="iam-prompt">{{ t('iam.register-subtitle') }}</p>

      <form class="iam-form" @submit.prevent="submit">
        <!-- Account type -->
        <section class="section">
          <h3 class="section-title">{{ t('iam.account-type') }}</h3>
          <pv-select-button
              v-model="role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              class="role-toggle"
          />
        </section>

        <!-- Company information -->
        <section class="section">
          <h3 class="section-title">{{ t('iam.company-information') }}</h3>

          <div class="field-row">
            <label class="field">
              <span class="field-label">{{ t('iam.company-name') }}</span>
              <pv-input-text v-model="companyName" :placeholder="t('iam.company-name')"/>
            </label>
            <label class="field">
              <span class="field-label">{{ t('iam.ruc') }}</span>
              <pv-input-text v-model="ruc" :placeholder="t('iam.ruc')"/>
            </label>
          </div>

          <label v-if="!isProvider" class="field">
            <span class="field-label">{{ t('iam.sector') }}</span>
            <pv-select
                v-model="sector"
                :options="sectorOptions"
                option-label="label"
                option-value="value"
                :placeholder="t('iam.sector')"
            />
          </label>

          <div class="field-row">
            <label class="field">
              <span class="field-label">{{ t('iam.address') }}</span>
              <pv-input-text v-model="address" :placeholder="t('iam.address')"/>
            </label>
            <label class="field">
              <span class="field-label">{{ t('iam.phone') }}</span>
              <pv-input-text v-model="phone" :placeholder="t('iam.phone')"/>
            </label>
          </div>

          <template v-if="isProvider">
            <label class="field">
              <span class="field-label">{{ t('iam.description') }}</span>
              <pv-textarea v-model="description" rows="2" auto-resize :placeholder="t('iam.description')"/>
            </label>
          </template>
        </section>

        <!-- User account -->
        <section class="section">
          <h3 class="section-title">{{ t('iam.user-account') }}</h3>

          <label class="field">
            <span class="field-label">{{ t('iam.email') }}</span>
            <pv-input-text v-model="email" type="email" autocomplete="email" :placeholder="t('iam.email')"/>
          </label>

          <div class="field-row">
            <label class="field">
              <span class="field-label">{{ t('iam.password') }}</span>
              <pv-input-text v-model="password" type="password" autocomplete="new-password" :placeholder="t('iam.password')"/>
            </label>
            <label class="field">
              <span class="field-label">{{ t('iam.confirm-password') }}</span>
              <pv-input-text v-model="confirmPassword" type="password" autocomplete="new-password" :placeholder="t('iam.confirm-password')"/>
            </label>
          </div>
        </section>

        <pv-message v-if="errorKey" severity="error" :closable="false" class="iam-error">
          {{ t(errorKey) }}
        </pv-message>

        <pv-button
            type="submit"
            :label="t('iam.create-account')"
            icon="pi pi-user-plus"
            class="iam-submit"
            :loading="iamStore.loading"
        />
      </form>

      <p class="iam-switch">
        {{ t('iam.have-account') }}
        <router-link to="/iam/login">{{ t('iam.sign-in') }}</router-link>
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
  width: 100%; max-width: 560px; box-shadow: 0 20px 50px rgba(0,0,0,.25);
}
.iam-brand { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.iam-logo { height: 48px; object-fit: contain; }
.iam-title { font-size: 1.6rem; font-weight: 800; color: #1e3a8a; margin: 0; }
.iam-subtitle { font-size: .82rem; color: #64748b; margin: 2px 0 0; }
.iam-heading { font-size: 1.35rem; font-weight: 700; color: #1a2744; margin: .5rem 0 .25rem; }
.iam-prompt { font-size: .92rem; color: #64748b; margin: 0 0 1.25rem; }

.iam-form { display: flex; flex-direction: column; gap: 1.5rem; }
.section { display: flex; flex-direction: column; gap: 1rem; }
.section-title { font-size: .78rem; font-weight: 700; color: #1e3a8a; text-transform: uppercase; letter-spacing: .5px; margin: 0; padding-bottom: .35rem; border-bottom: 1px solid #eef2f7; }
.role-toggle { width: 100%; }

.field { display: flex; flex-direction: column; gap: .35rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field-label { font-size: .8rem; font-weight: 600; color: #475569; }
.field :deep(.p-inputtext),
.field :deep(.p-select),
.field :deep(.p-multiselect),
.field :deep(.p-textarea),
.field :deep(.p-selectbutton) { width: 100%; }
.role-toggle :deep(.p-togglebutton) { flex: 1; }

.iam-error { margin: 0; }
.iam-submit { margin-top: .25rem; width: 100%; justify-content: center; }

.iam-switch { margin-top: 1.25rem; font-size: .88rem; color: #64748b; text-align: center; }
.iam-switch a { color: #2563eb; font-weight: 600; text-decoration: none; }

@media (max-width: 520px) {
  .field-row { grid-template-columns: 1fr; }
}
</style>
