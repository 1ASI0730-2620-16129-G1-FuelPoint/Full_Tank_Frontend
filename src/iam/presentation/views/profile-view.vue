<script setup>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import useIamStore from '../../application/iam.store.js';
import pinia from '../../../pinia.js';

const { t } = useI18n();
const toast = useToast();
const iamStore = useIamStore(pinia);

const email = ref(iamStore.email);
const profileError = ref(null);
const savingProfile = ref(false);

const companyName = ref('');
const ruc = ref('');
const address = ref('');
const phone = ref('');
const sector = ref(null);
const description = ref('');
const companyError = ref(null);
const savingCompany = ref(false);

const currentPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');
const passwordError = ref(null);
const savingPassword = ref(false);

const roleLabel = computed(() =>
    iamStore.isProvider ? t('iam.provider-account') : t('iam.buyer-account'),
);
const sectorOptions = computed(() => [
  { label: t('iam.sector-transport'), value: 'TRANSPORT' },
  { label: t('iam.sector-mining'), value: 'MINING' },
  { label: t('iam.sector-construction'), value: 'CONSTRUCTION' },
  { label: t('iam.sector-maritime'), value: 'MARITIME' },
  { label: t('iam.sector-logistics'), value: 'LOGISTICS' },
]);

function fillCompanyForm(company) {
  companyName.value = company?.name ?? iamStore.companyName;
  ruc.value = company?.ruc ?? '';
  address.value = company?.address ?? '';
  phone.value = company?.phone ?? '';
  sector.value = company?.sector ?? null;
  description.value = company?.description ?? '';
}

onMounted(async () => {
  await iamStore.fetchCurrentUser();
  email.value = iamStore.email;
  fillCompanyForm(iamStore.currentCompany);
});

async function saveCompany() {
  companyError.value = null;
  if (!companyName.value || !ruc.value) {
    companyError.value = 'iam.required';
    return;
  }
  savingCompany.value = true;
  try {
    await iamStore.updateCompanyProfile({
      companyName: companyName.value.trim(),
      ruc: ruc.value.trim(),
      address: address.value.trim(),
      phone: phone.value.trim(),
      sector: sector.value,
      description: description.value.trim(),
    });
    fillCompanyForm(iamStore.currentCompany);
    toast.add({ severity: 'success', summary: t('iam.company-updated'), life: 3000 });
  } catch (e) {
    companyError.value = e.message || 'common.error';
  } finally {
    savingCompany.value = false;
  }
}

async function saveProfile() {
  profileError.value = null;
  if (!email.value) {
    profileError.value = 'iam.required';
    return;
  }
  savingProfile.value = true;
  try {
    await iamStore.updateProfile({ email: email.value.trim() });
    toast.add({ severity: 'success', summary: t('iam.profile-updated'), life: 3000 });
  } catch (e) {
    profileError.value = e.message || 'common.error';
  } finally {
    savingProfile.value = false;
  }
}

async function savePassword() {
  passwordError.value = null;
  if (!currentPassword.value || !newPassword.value || !confirmNewPassword.value) {
    passwordError.value = 'iam.required';
    return;
  }
  savingPassword.value = true;
  try {
    await iamStore.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      confirmNewPassword: confirmNewPassword.value,
    });
    toast.add({ severity: 'success', summary: t('iam.password-updated'), life: 3000 });
    currentPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
  } catch (e) {
    passwordError.value = e.message || 'common.error';
  } finally {
    savingPassword.value = false;
  }
}
</script>

<template>
  <div class="profile-page">
    <header class="profile-header">
      <h1>{{ iamStore.displayName }}</h1>
      <p>{{ t('iam.profile-subtitle') }}</p>
    </header>

    <section class="card company-card">
      <h2 class="card-title"><i class="pi pi-building"/> {{ t('iam.company-profile') }}</h2>

      <form class="form" @submit.prevent="saveCompany">
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

        <label v-if="!iamStore.isProvider" class="field">
          <span class="field-label">{{ t('iam.sector') }}</span>
          <pv-select v-model="sector" :options="sectorOptions" option-label="label" option-value="value"/>
        </label>

        <template v-else>
          <label class="field">
            <span class="field-label">{{ t('iam.description') }}</span>
            <pv-textarea v-model="description" rows="3" auto-resize/>
          </label>
        </template>

        <pv-message v-if="companyError" severity="error" :closable="false">{{ t(companyError) }}</pv-message>
        <pv-button
            type="submit"
            :label="t('iam.save-changes')"
            icon="pi pi-check"
            :loading="savingCompany"
        />
      </form>
    </section>

    <div class="profile-grid">
      <section class="card">
        <h2 class="card-title"><i class="pi pi-user"/> {{ t('iam.user-account') }}</h2>

        <div class="readonly-row">
          <span class="readonly-label">{{ t('iam.role') }}</span>
          <span class="pill" :class="iamStore.isProvider ? 'provider' : 'buyer'">{{ roleLabel }}</span>
        </div>

        <form class="form" @submit.prevent="saveProfile">
          <label class="field">
            <span class="field-label">{{ t('iam.email') }}</span>
            <pv-input-text v-model="email" type="email" :placeholder="t('iam.email')"/>
          </label>

          <pv-message v-if="profileError" severity="error" :closable="false">{{ t(profileError) }}</pv-message>
          <pv-button
              type="submit"
              :label="t('iam.save-changes')"
              icon="pi pi-check"
              :loading="savingProfile"
          />
        </form>
      </section>

      <section class="card">
        <h2 class="card-title"><i class="pi pi-lock"/> {{ t('iam.change-password') }}</h2>

        <form class="form" @submit.prevent="savePassword">
          <label class="field">
            <span class="field-label">{{ t('iam.current-password') }}</span>
            <pv-input-text v-model="currentPassword" type="password" autocomplete="current-password"/>
          </label>
          <label class="field">
            <span class="field-label">{{ t('iam.new-password') }}</span>
            <pv-input-text v-model="newPassword" type="password" autocomplete="new-password"/>
          </label>
          <label class="field">
            <span class="field-label">{{ t('iam.confirm-new-password') }}</span>
            <pv-input-text v-model="confirmNewPassword" type="password" autocomplete="new-password"/>
          </label>

          <pv-message v-if="passwordError" severity="error" :closable="false">{{ t(passwordError) }}</pv-message>
          <pv-button
              type="submit"
              :label="t('iam.change-password')"
              icon="pi pi-key"
              severity="secondary"
              :loading="savingPassword"
          />
        </form>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page { max-width: 920px; }
.profile-header { margin-bottom: 1.5rem; }
.profile-header h1 { font-size: 1.6rem; font-weight: 800; color: #1a2744; margin: 0; }
.profile-header p { margin: .25rem 0 0; color: #64748b; font-size: .92rem; }

.company-card { margin-bottom: 1.5rem; }
.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
.card { background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 1.5rem; }
.card-title { display: flex; align-items: center; gap: .5rem; font-size: 1.05rem; font-weight: 700; color: #1a2744; margin: 0 0 1.25rem; }

.readonly-row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 1rem; margin-bottom: 1rem; border-bottom: 1px solid #eef2f7; }
.readonly-label { font-size: .8rem; font-weight: 600; color: #475569; }
.pill { font-size: .72rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: .4px; }
.pill.buyer { background: #e8f0fd; color: #2563eb; }
.pill.provider { background: #e6f7f1; color: #059669; }

.form { display: flex; flex-direction: column; gap: 1rem; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: .35rem; }
.field-label { font-size: .8rem; font-weight: 600; color: #475569; }
.field :deep(.p-inputtext),
.field :deep(.p-select),
.field :deep(.p-multiselect),
.field :deep(.p-textarea) { width: 100%; }

@media (max-width: 720px) {
  .profile-grid, .field-row { grid-template-columns: 1fr; }
}
</style>
