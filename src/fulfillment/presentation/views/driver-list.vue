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
const { drivers, errors, driversLoaded, loading } = toRefs(store);
const { fetchDrivers, deleteDriver, clearErrors } = store;
const { t } = useI18n();
const showAvailableOnly = ref(false);

const filteredDrivers = computed(() => {
  if (!showAvailableOnly.value) return drivers.value;
  return drivers.value.filter(d => d.status === 'AVAILABLE');
});

const navigateToNew = () => router.push({ name: 'fulfillment-driver-new' });
const navigateToEdit = (id) => router.push({ name: 'fulfillment-driver-edit', params: { id } });

const onRefresh = () => {
  clearErrors();
  fetchDrivers(iamStore.currentProviderId);
};

const confirmDelete = (driver) => {
  confirm.require({
    message: `Delete driver ${driver.name}?`,
    header: 'Delete Driver',
    icon: 'pi pi-exclamation-triangle',
    accept: () => deleteDriver(driver)
  });
};

const getStatusSeverity = (status) => {
  const map = {
    'AVAILABLE': 'success',
    'ASSIGNED': 'info'
  };
  return map[status] || 'secondary';
};

onMounted(() => {
  fetchDrivers(iamStore.currentProviderId);
});
</script>

<template>
  <div>
        <div class="page-header">
          <div class="page-title-group">
            <h1 class="page-title">{{ t('fulfillment.driver-list.title') }}</h1>
            <p class="page-subtitle">{{ t('fulfillment.driver-list.subtitle') }}</p>
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
                :label="t('fulfillment.driver-list.register')"
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
                :value="filteredDrivers"
                :loading="loading"
                responsive-layout="scroll"
                class="drivers-table"
            >
              <template #empty>
                <div class="empty-row">{{ t('fulfillment.driver-list.no-data') }}</div>
              </template>
              <pv-column field="name" :header="t('fulfillment.driver-list.col-name')">
                <template #body="{ data }">
                  <strong>{{ data.name }}</strong>
                </template>
              </pv-column>
              <pv-column field="licenseNumber" :header="t('fulfillment.driver-list.col-license')" />
              <pv-column field="phone" :header="t('fulfillment.driver-list.col-phone')" />
              <pv-column field="email" :header="t('fulfillment.driver-list.col-email')" />
              <pv-column field="status" :header="t('fulfillment.driver-list.col-status')">
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
.drivers-table :deep(.p-datatable-table) { width: 100%; border-collapse: collapse; }
.drivers-table :deep(.p-datatable-thead > tr > th) {
  text-align: left; font-weight: 600;
  color: #1E3A8A; font-size: 0.95rem;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid #E5E7EB;
  background: #ffffff;
}
.drivers-table :deep(.p-datatable-tbody > tr > td) {
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
