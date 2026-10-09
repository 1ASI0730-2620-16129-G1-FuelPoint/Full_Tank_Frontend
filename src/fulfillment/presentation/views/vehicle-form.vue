<script setup>
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, ref, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import useFulfillmentStore from "../../application/fulfillment.store.js";
import { Vehicle } from "../../domain/model/vehicle.entity.js";
import useIamStore from "../../../iam/application/iam.store.js";
import pinia from "../../../pinia.js";

const route = useRoute();
const router = useRouter();
const store = useFulfillmentStore();
const iamStore = useIamStore(pinia);
const { errors, vehiclesLoaded } = toRefs(store);
const { addVehicle, updateVehicle, fetchVehicles, getVehicleById } = store;
const { t } = useI18n();

const isEdit = computed(() => !!route.params.id);

const statusOptions = [
  { label: 'Available', value: 'AVAILABLE' },
  { label: 'In Route', value: 'IN_ROUTE' },
  { label: 'Maintenance', value: 'MAINTENANCE' }
];

const unitOptions = [
  { label: 'Liters', value: 'LITERS' },
  { label: 'Gallons', value: 'GALLONS' }
];

const form = ref({
  plate: '',
  brand: '',
  model: '',
  capacity: 0,
  unit: 'LITERS',
  status: 'AVAILABLE'
});

onMounted(async () => {
  if (isEdit.value) {
    await fetchVehicles(iamStore.currentProviderId);
    loadVehicleIntoForm();
  }
});

const loadVehicleIntoForm = () => {
  const vehicle = getVehicleById(route.params.id);
  if (vehicle) {
    form.value.plate = vehicle.plate;
    form.value.brand = vehicle.brand;
    form.value.model = vehicle.model;
    form.value.capacity = vehicle.capacity;
    form.value.unit = vehicle.unit;
    form.value.status = vehicle.status;
  }
};

const navigateBack = () => router.push({ name: 'fulfillment-vehicles' });

const saveVehicle = () => {
  const vehicle = new Vehicle({
    id: isEdit.value ? route.params.id : null,
    providerId: iamStore.currentProviderId,
    plate: form.value.plate,
    brand: form.value.brand,
    model: form.value.model,
    capacity: Number(form.value.capacity),
    unit: form.value.unit,
    status: form.value.status
  });
  if (isEdit.value) updateVehicle(vehicle);
  else addVehicle(vehicle);
  navigateBack();
};
</script>

<template>
  <div>
    <div class="page-header">
      <h1 class="page-title">{{ isEdit ? 'Edit Vehicle' : 'Register New Vehicle' }}</h1>
      <p class="page-subtitle">{{ isEdit ? 'Update vehicle information' : 'Add a new vehicle to your fleet' }}</p>
    </div>

    <pv-message v-if="errors.length" severity="error" class="error-banner">
      {{ t('errors.fetch') }}: {{ errors[0]?.message || 'Unknown Error' }}
    </pv-message>

    <pv-card class="form-card">
      <template #content>
        <form class="form-content" @submit.prevent="saveVehicle">
          <!-- License Plate -->
          <div class="field-group">
            <div class="field-icon"><i class="pi pi-id-card"/></div>
            <div class="field-content">
              <label>License Plate<span class="req">*</span></label>
              <pv-input-text v-model="form.plate" class="text-input" required/>
            </div>
          </div>

          <!-- Brand + Model -->
          <div class="field-row">
            <div class="field-group field-group-half">
              <div class="field-icon"><i class="pi pi-tag"/></div>
              <div class="field-content">
                <label>Brand<span class="req">*</span></label>
                <pv-input-text v-model="form.brand" class="text-input" required/>
              </div>
            </div>
            <div class="field-group field-group-half">
              <div class="field-icon"><i class="pi pi-box"/></div>
              <div class="field-content">
                <label>Model<span class="req">*</span></label>
                <pv-input-text v-model="form.model" class="text-input" required/>
              </div>
            </div>
          </div>

          <!-- Capacity + Unit -->
          <div class="field-row">
            <div class="field-group field-group-half">
              <div class="field-icon"><i class="pi pi-database"/></div>
              <div class="field-content">
                <label>Capacity<span class="req">*</span></label>
                <pv-input-number v-model="form.capacity" :min="1" class="text-input" input-class="text-input-native" required/>
              </div>
            </div>
            <div class="field-group field-group-half">
              <div class="field-icon"><i class="pi pi-list"/></div>
              <div class="field-content">
                <label>Unit<span class="req">*</span></label>
                <pv-select v-model="form.unit" :options="unitOptions" option-label="label" option-value="value" class="select-input" required/>
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
            <pv-button type="submit" :label="isEdit ? 'Update Vehicle' : 'Register Vehicle'" icon="pi pi-save" class="btn-primary" />
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
.select-input :deep(.p-select-label),
.text-input-native {
  border: none; outline: none; padding: 0.25rem 0;
  font-size: 0.95rem; font-family: inherit;
  color: #1f2937; width: 100%; background: transparent; box-shadow: none;
}
.text-input :deep(.p-inputnumber-input) { border: none; padding: 0.25rem 0; background: transparent; box-shadow: none; }
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
