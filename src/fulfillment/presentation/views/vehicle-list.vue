<script setup>
import { useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { onMounted, ref, computed, toRefs } from "vue";
import { useI18n } from "vue-i18n";
import useFulfillmentStore from "../../application/fulfillment.store.js";
import useIamStore from "../../../iam/application/iam.store.js";
import pinia from "../../../pinia.js";

const router = useRouter();
const confirm = useConfirm();
const store = useFulfillmentStore();
const iamStore = useIamStore(pinia);
const { vehicles, errors, vehiclesLoaded, loading } = toRefs(store);
const { fetchVehicles, deleteVehicle, clearErrors } = store;
const { t } = useI18n();
const showAvailableOnly = ref(false);

const filteredVehicles = computed(() => {
  if (!showAvailableOnly.value) return vehicles.value;
  return vehicles.value.filter(v => v.status === 'AVAILABLE');
});

const navigateToNew = () => router.push({ name: 'fulfillment-vehicle-new' });
const navigateToEdit = (id) => router.push({ name: 'fulfillment-vehicle-edit', params: { id } });

const onRefresh = () => {
  clearErrors();
  fetchVehicles(iamStore.currentProviderId);
};

const confirmDelete = (vehicle) => {
  confirm.require({
    message: `Delete vehicle ${vehicle.plate}?`,
    header: 'Delete Vehicle',
    icon: 'pi pi-exclamation-triangle',
    accept: () => deleteVehicle(vehicle)
  });
};

const getStatusSeverity = (status) => {
  const map = {
    'AVAILABLE': 'success',
    'IN_ROUTE': 'info',
    'MAINTENANCE': 'warn'
  };
  return map[status] || 'secondary';
};

onMounted(() => {
  fetchVehicles(iamStore.currentProviderId);
});
</script>

<template>
  <div>
        <div class="page-header">
          <div class="page-title-group">
            <h1 class="page-title">{{ t('fulfillment.vehicle-list.title') }}</h1>
            <p class="page-subtitle">{{ t('fulfillment.vehicle-list.subtitle') }}</p>
          </div>
          <div class="page-actions">
            <pv-button
                :label="t('fulfillment.show-all')"
                icon="pi pi-list"
                class="filter-btn"
                :class="{ 'filter-active': !showAvailableOnly }"
                @click="showAvailableOnly = false"
            />
            <pv-button
                :label="t('fulfillment.available-only')"
                icon="pi pi-check-circle"
                class="filter-btn"
                :class="{ 'filter-active': showAvailableOnly }"
                @click="showAvailableOnly = true"
            />
            <pv-button
                icon="pi pi-refresh"
                text
                rounded
                class="refresh-btn"
                :loading="loading"
                @click="onRefresh"
            />
            <pv-button
                :label="t('fulfillment.vehicle-list.register')"
                icon="pi pi-plus"
                class="add-btn"
                @click="navigateToNew"
            />
          </div>
        </div>

        <pv-message v-if="errors.length" severity="error" class="error-banner">
          {{ t('errors.fetch') }}: {{ errors[0]?.message || 'Unknown Error' }}
        </pv-message>

        <pv-card class="table-card">
          <template #content>
            <pv-data-table
                :value="filteredVehicles"
                :loading="loading"
                responsive-layout="scroll"
                class="vehicles-table"
            >
              <template #empty>
                <div class="empty-row">{{ t('fulfillment.vehicle-list.no-data') }}</div>
              </template>
              <pv-column field="plate" :header="t('fulfillment.vehicle-list.col-plate')">
                <template #body="{ data }">
                  <strong>{{ data.plate }}</strong>
                </template>
              </pv-column>
              <pv-column field="brand" :header="t('fulfillment.vehicle-list.col-brand')" />
              <pv-column field="model" :header="t('fulfillment.vehicle-list.col-model')" />
              <pv-column field="capacity" :header="t('fulfillment.vehicle-list.col-capacity')">
                <template #body="{ data }">
                  {{ data.capacity.toLocaleString() }} {{ data.unit }}
                </template>
              </pv-column>
              <pv-column field="status" :header="t('fulfillment.vehicle-list.col-status')">
                <template #body="{ data }">
                  <pv-tag :value="data.status" :severity="getStatusSeverity(data.status)" class="status-pill" />
                </template>
              </pv-column>
              <pv-column class="actions-col">
                <template #body="{ data }">
                  <div class="row-actions">
                    <pv-button icon="pi pi-pencil" text rounded class="row-btn" @click="navigateToEdit(data.id)" />
                    <pv-button icon="pi pi-times" text rounded class="row-btn row-btn-danger" @click="confirmDelete(data)" />
                  </div>
                </template>
              </pv-column>
            </pv-data-table>
          </template>
        </pv-card>
  </div>
</template>

<style scoped>
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 1.25rem;
}
.page-title { font-size: 1.75rem; font-weight: 700; color: #1E3A8A; margin: 0; }
.page-subtitle { color: #6B7280; font-size: 0.9rem; margin: 0.25rem 0 0 0; }
.page-actions { display: flex; align-items: center; gap: 0.75rem; }
.filter-btn {
  display: flex; align-items: center; gap: 0.5rem;
  background: #ffffff; color: #6B7280;
  border: 1px solid #D1D5DB; border-radius: 8px;
  padding: 0.55rem 1rem;
  font-weight: 600; font-size: 0.85rem; cursor: pointer;
}
.filter-btn:hover { background: #F9FAFB; }
.filter-btn.filter-active {
  background: #EFF6FF; color: #1E3A8A;
  border-color: #1E3A8A;
}
.refresh-btn {
  width: 40px; height: 40px; border-radius: 50%;
  border: none; background: transparent;
  color: #1E3A8A; cursor: pointer; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center;
}
.refresh-btn:hover { background: #EFF6FF; }
.refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.add-btn {
  display: flex; align-items: center; gap: 0.5rem;
  background: #ffffff; color: #1E3A8A;
  border: 1.5px solid #1E3A8A; border-radius: 999px;
  padding: 0.55rem 1.25rem;
  font-weight: 600; font-size: 0.9rem; cursor: pointer;
}
.add-btn:hover { background: #1E3A8A; color: #fff; }

.error-banner {
  background: #FEE2E2; border: 1px solid #FCA5A5;
  color: #B91C1C; padding: 1rem 1.25rem;
  border-radius: 8px;
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 1.25rem; font-size: 0.95rem;
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.table-card :deep(.p-card-body) { padding: 1.5rem 2rem; }
.table-card :deep(.p-card-content) { padding: 0; }
.vehicles-table :deep(.p-datatable-table) { width: 100%; border-collapse: collapse; }
.vehicles-table :deep(.p-datatable-thead > tr > th) {
  text-align: left; font-weight: 600;
  color: #1E3A8A; font-size: 0.95rem;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #E5E7EB;
  background: #ffffff;
}
.vehicles-table :deep(.p-datatable-tbody > tr > td) {
  padding: 1rem 0.5rem; color: #1f2937; font-size: 0.92rem;
  border-bottom: 1px solid #F3F4F6;
}
.empty-row { text-align: center; color: #9CA3AF; padding: 3rem 0 !important; }
.actions-col { width: 100px; text-align: right; }
.row-actions { display: flex; justify-content: flex-end; gap: 0.25rem; }
.row-btn {
  border: none; background: transparent;
  width: 32px; height: 32px; border-radius: 50%;
  cursor: pointer; color: #475569; margin-left: 4px;
}
.row-btn:hover { background: #F3F4F6; color: #1E3A8A; }
.row-btn-danger:hover { color: #DC2626; background: #FEE2E2; }
.status-pill { font-size: 0.8rem; font-weight: 600; }
</style>
