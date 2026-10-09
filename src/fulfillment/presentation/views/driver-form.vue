<script setup>
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, ref, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import useFulfillmentStore from "../../application/fulfillment.store.js";
import { Driver } from "../../domain/model/driver.entity.js";
import useIamStore from "../../../iam/application/iam.store.js";
import pinia from "../../../pinia.js";

const route = useRoute();
const router = useRouter();
const store = useFulfillmentStore();
const iamStore = useIamStore(pinia);
const { errors, driversLoaded } = toRefs(store);
const { addDriver, updateDriver, fetchDrivers, getDriverById } = store;
const { t } = useI18n();

const isEdit = computed(() => !!route.params.id);

const statusOptions = [
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'Assigned', value: 'ASSIGNED' }
];

const form = ref({
  name: '',
  licenseNumber: '',
  phone: '',
  email: '',
  status: 'AVAILABLE'
});

onMounted(async () => {
  if (isEdit.value) {
    await fetchDrivers(iamStore.currentProviderId);
    loadDriverIntoForm();
  }
});

const loadDriverIntoForm = () => {
  const driver = getDriverById(route.params.id);
  if (driver) {
    form.value.name = driver.name;
    form.value.licenseNumber = driver.licenseNumber;
    form.value.phone = driver.phone;
    form.value.email = driver.email;
    form.value.status = driver.status;
  }
};

const navigateBack = () => router.push({ name: 'fulfillment-drivers' });

const saveDriver = () => {
  const driver = new Driver({
    id: isEdit.value ? route.params.id : null,
    providerId: iamStore.currentProviderId,
    name: form.value.name,
    licenseNumber: form.value.licenseNumber,
    phone: form.value.phone,
    email: form.value.email,
    status: form.value.status
  });
  if (isEdit.value) updateDriver(driver);
  else addDriver(driver);
  navigateBack();
};
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? 'Edit Driver' : 'Register New Driver' }}</h1>
      <p class="page-subtitle">{{ isEdit ? 'Update driver information' : 'Add a new authorized driver' }}</p>
    </div>

    <pv-message v-if="errors.length" severity="error" class="error-banner">
      {{ t('errors.fetch') }}: {{ errors[0]?.message || 'Unknown Error' }}
    </pv-message>

    <pv-card class="form-card">
      <template #content>
        <form class="form-content" @submit.prevent="saveDriver">
          <!-- Full Name -->
          <div class="field-group">
            <div class="field-icon"><i class="pi pi-user"/></div>
            <div class="field-content">
              <label>Full Name<span class="req">*</span></label>
              <pv-input-text v-model="form.name" class="text-input" required/>
            </div>
          </div>

          <!-- License Number -->
          <div class="field-group">
            <div class="field-icon"><i class="pi pi-id-card"/></div>
            <div class="field-content">
              <label>License Number<span class="req">*</span></label>
              <pv-input-text v-model="form.licenseNumber" class="text-input" required/>
            </div>
          </div>

          <!-- Phone + Email -->
          <div class="field-row">
            <div class="field-group field-group-half">
              <div class="field-icon"><i class="pi pi-phone"/></div>
              <div class="field-content">
                <label>Phone<span class="req">*</span></label>
                <pv-input-text v-model="form.phone" type="tel" class="text-input" required/>
              </div>
            </div>
            <div class="field-group field-group-half">
              <div class="field-icon"><i class="pi pi-envelope"/></div>
              <div class="field-content">
                <label>Email<span class="req">*</span></label>
                <pv-input-text v-model="form.email" type="email" class="text-input" required/>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div class="field-group">
            <div class="field-icon"><i class="pi pi-check-circle"/></div>
            <div class="field-content">
              <label>Status<span class="req">*</span></label>
              <pv-select v-model="form.status" :options="statusOptions" option-label="label" option-value="value" class="select-input" required/>
            </div>
          </div>

          <!-- ACTIONS -->
          <div class="form-actions">
            <pv-button type="button" label="Cancel" outlined class="btn-secondary" @click="navigateBack" />
            <pv-button type="submit" :label="isEdit ? 'Update Driver' : 'Register Driver'" icon="pi pi-save" class="btn-primary" />
          </div>
        </form>
      </template>
    </pv-card>
  </div>
</template>

<style scoped>
.page-header { margin-bottom: 1.5rem; }
.page-title { font-size: 1.75rem; font-weight: 700; color: #1E3A8A; margin: 0; }
.page-subtitle { color: #6B7280; font-size: 0.9rem; margin: 0.25rem 0 0 0; }

.error-banner { margin-bottom: 1.25rem; }

.form-card { border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.form-card :deep(.p-card-body) { padding: 2rem; }
.form-card :deep(.p-card-content) { padding: 0; }

.form-content { display: flex; flex-direction: column; gap: 1.25rem; }

.field-group {
  display: flex; align-items: stretch; gap: 0.5rem;
  border: 1px solid #D1D5DB; border-radius: 8px;
  padding: 0.5rem 1rem;
  transition: border-color 0.2s; background: #ffffff;
}
.field-group:focus-within { border-color: #1E3A8A; }
.field-icon { display: flex; align-items: center; color: #6B7280; font-size: 1.1rem; padding-right: 0.5rem; }
.field-content { display: flex; flex-direction: column; flex: 1; padding: 0.25rem 0; }
.field-content label { font-size: 0.78rem; color: #6B7280; font-weight: 500; margin-bottom: 0.15rem; }
.req { color: #DC2626; margin-left: 2px; }

.text-input, .select-input,
.text-input :deep(.p-inputtext),
.select-input :deep(.p-select-label) {
  border: none; outline: none; padding: 0.25rem 0;
  font-size: 0.95rem; font-family: inherit;
  color: #1f2937; width: 100%; background: transparent; box-shadow: none;
}
.select-input { cursor: pointer; width: 100%; border: none; background: transparent; box-shadow: none; }
.select-input :deep(.p-select-dropdown) { color: #6B7280; }

.field-row { display: flex; gap: 1rem; }
.field-group-half { flex: 1; }

.form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; }
.btn-secondary {
  background: #ffffff; color: #475569; border: 1px solid #D1D5DB;
  padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;
}
.btn-secondary:hover { background: #F3F4F6; }
.btn-primary {
  background: #1E3A8A; color: #ffffff; border: none;
  padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer;
  display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;
}
.btn-primary:hover { background: #1E40AF; }
</style>
