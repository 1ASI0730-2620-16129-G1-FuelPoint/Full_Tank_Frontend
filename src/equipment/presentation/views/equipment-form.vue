<script setup>
/**
 * Equipment create/edit form page (buyer). Uses only the Equipment store and the
 * IAM directory (for the favorite-provider picker).
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import useEquipmentStore from '../../application/equipment.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { FUEL_TYPES, MEASUREMENT_UNITS } from '../../../shared/domain/fuel-types.js';
import pinia from '../../../pinia.js';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const equipmentStore = useEquipmentStore(pinia);
const iamStore = useIamStore(pinia);

const isEdit = computed(() => !!route.params.id);
const submitted = ref(false);

const equipmentTypes = [
  'Heavy-duty vehicle', 'Transport fleet', 'Electric generator', 'Boiler',
  'Industrial machinery', 'Industrial oven', 'Storage tank', 'Agricultural equipment', 'Thermal system',
];
const statuses = ['operational', 'low_fuel', 'critical', 'maintenance', 'inactive'];

const form = ref({
  id: null,
  companyId: null,
  name: '',
  type: 'Heavy-duty vehicle',
  requiredFuelType: 'DIESEL_B5',
  capacity: 1000,
  currentLevel: 500,
  unit: 'LITERS',
  status: 'operational',
  favoriteProviderId: null,
  autoRefill: false,
  refillThreshold: 20,
  location: '',
  lastRefillDate: null,
});

onMounted(async () => {
  if (!iamStore.providerCompanies.length) await iamStore.fetchDirectories();
  if (isEdit.value) {
    if (!equipmentStore.loaded) await equipmentStore.fetchEquipment();
    const existing = equipmentStore.getEquipmentById(route.params.id);
    if (existing) form.value = { ...existing };
  }
});

const valid = computed(() =>
  form.value.name.trim().length > 0 &&
  Number(form.value.capacity) > 0 &&
  Number(form.value.currentLevel) >= 0 &&
  Number(form.value.currentLevel) <= Number(form.value.capacity)
);

async function save() {
  submitted.value = true;
  if (!valid.value) return;

  const payload = { ...form.value, companyId: form.value.companyId ?? iamStore.currentCompanyId };
  if (isEdit.value) {
    await equipmentStore.updateEquipment(payload);
    toast.add({ severity: 'success', summary: t('equipment.updated'), life: 3000 });
  } else {
    await equipmentStore.addEquipment(payload);
    toast.add({ severity: 'success', summary: t('equipment.created'), life: 3000 });
  }
  router.push('/equipment');
}
</script>

<template>
  <div class="form-page">
    <button class="back-btn" @click="router.push('/equipment')">
      <i class="pi pi-arrow-left"/> {{ t('equipment.back') }}
    </button>

    <pv-card class="form-card">
      <template #content>
        <h2 class="form-title">{{ isEdit ? t('equipment.edit-title') : t('equipment.add-title') }}</h2>
        <p class="form-sub">{{ isEdit ? t('equipment.edit-sub') : t('equipment.add-sub') }}</p>

        <div class="grid">
          <div class="field span-2">
            <label>{{ t('equipment.field-name') }}</label>
            <pv-input-text v-model="form.name" :placeholder="t('equipment.field-name')"/>
            <small v-if="submitted && !form.name.trim()" class="err">{{ t('equipment.required') }}</small>
          </div>

          <div class="field">
            <label>{{ t('equipment.field-type') }}</label>
            <pv-select v-model="form.type" :options="equipmentTypes" class="w-full"/>
          </div>
          <div class="field">
            <label>{{ t('equipment.field-fuel') }}</label>
            <pv-select v-model="form.requiredFuelType" :options="FUEL_TYPES" option-label="label" option-value="code" class="w-full"/>
          </div>

          <div class="field">
            <label>{{ t('equipment.field-capacity') }}</label>
            <pv-input-number v-model="form.capacity" :min="1" class="w-full"/>
          </div>
          <div class="field">
            <label>{{ t('equipment.field-level') }}</label>
            <pv-input-number v-model="form.currentLevel" :min="0" class="w-full"/>
            <small v-if="submitted && Number(form.currentLevel) > Number(form.capacity)" class="err">{{ t('equipment.level-error') }}</small>
          </div>

          <div class="field">
            <label>{{ t('equipment.field-unit') }}</label>
            <pv-select v-model="form.unit" :options="MEASUREMENT_UNITS" option-label="label" option-value="code" class="w-full"/>
          </div>
          <div class="field">
            <label>{{ t('equipment.field-status') }}</label>
            <pv-select v-model="form.status" :options="statuses" class="w-full">
              <template #value="{ value }">{{ value ? t('equipment.status-' + value) : '' }}</template>
              <template #option="{ option }">{{ t('equipment.status-' + option) }}</template>
            </pv-select>
          </div>

          <div class="field">
            <label>{{ t('equipment.field-provider') }}</label>
            <pv-select v-model="form.favoriteProviderId" :options="iamStore.providerCompanies" option-label="name" option-value="id" show-clear class="w-full" :placeholder="t('equipment.field-provider')"/>
          </div>
          <div class="field">
            <label>{{ t('equipment.field-threshold') }} (%)</label>
            <pv-input-number v-model="form.refillThreshold" :min="0" :max="100" class="w-full"/>
          </div>

          <div class="field span-2">
            <label>{{ t('equipment.field-location') }}</label>
            <pv-input-text v-model="form.location" :placeholder="t('equipment.field-location')"/>
          </div>

          <div class="field span-2 checkbox-field">
            <pv-checkbox v-model="form.autoRefill" :binary="true" input-id="auto"/>
            <label for="auto">{{ t('equipment.field-auto') }}</label>
          </div>
        </div>

        <div class="form-actions">
          <pv-button :label="t('common.cancel')" text @click="router.push('/equipment')"/>
          <pv-button :label="t('equipment.save')" icon="pi pi-check" :disabled="!valid" @click="save"/>
        </div>
      </template>
    </pv-card>
  </div>
</template>

<style scoped>
.form-page { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.back-btn { align-self: flex-start; border: none; background: transparent; color: #64748b; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.back-btn:hover { color: #1e3a8a; }
.form-card { border-radius: 14px; }
.form-title { margin: 0; font-size: 1.4rem; color: #1a2744; }
.form-sub { margin: 4px 0 20px; color: #8b9ab5; font-size: .9rem; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.span-2 { grid-column: span 2; }
.field label { font-size: .82rem; font-weight: 600; color: #475569; }
.w-full { width: 100%; }
.w-full :deep(.p-inputnumber), .w-full :deep(.p-inputnumber-input) { width: 100%; }
.checkbox-field { flex-direction: row; align-items: center; gap: 10px; }
.err { color: #dc2626; font-size: .75rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
</style>
