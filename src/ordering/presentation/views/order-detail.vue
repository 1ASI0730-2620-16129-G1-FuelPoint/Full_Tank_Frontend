<script setup>
/**
 * Provider order detail page. The provider can dispatch an ACCEPTED order by
 * assigning a driver + vehicle (Fulfillment, via coordination). After dispatch
 * the provider only waits — the buyer confirms reception. Shows assigned
 * driver/vehicle, delivery address and a keyless Google Maps embed.
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import useOrderingStore from '../../application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { assignDelivery, listAvailableResources, listAllResources, cancelAcceptedOrder } from '../../../shared/application/coordination.service.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import { mapEmbedUrl, money, unitSuffix, formatDate as fmtDate } from '../../../shared/domain/helpers.js';
import pinia from '../../../pinia.js';

const route  = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const toast = useToast();
const store  = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);

// Driver/vehicle data is sourced via the coordination layer (not the Fulfillment store).
const assignVisible = ref(false);
const availableDrivers = ref([]);
const availableVehicles = ref([]);
const allDrivers = ref([]);
const allVehicles = ref([]);
const selectedDriver = ref(null);
const selectedVehicle = ref(null);
const assigning = ref(false);

onMounted(async () => {
  if (!store.ordersLoaded) await store.fetchOrders();
  if (!iamStore.buyerCompanies.length) await iamStore.fetchDirectories();
  const all = await listAllResources(iamStore.currentProviderId);
  allDrivers.value = all.drivers;
  allVehicles.value = all.vehicles;
});

const order = computed(() => store.getOrderById(route.params.id));

const statusSeverity = computed(() => orderStatusSeverity(order.value?.status));
const statusLabel = computed(() =>
  order.value ? t('ordering.status-' + order.value.status) : '—'
);

const buyerName = computed(() =>
  iamStore.buyerCompanies.find(c => c.id === (order.value?.companyId ?? order.value?.clientId))?.name
    ?? `Company #${order.value?.companyId ?? order.value?.clientId ?? '—'}`
);
const driverName = computed(() =>
  allDrivers.value.find(d => d.id === order.value?.driverId)?.name ?? t('ordering.not-assigned')
);
const vehicleLabel = computed(() => {
  const v = allVehicles.value.find(x => x.id === order.value?.vehicleId);
  return v ? `${v.plate} · ${v.brand} ${v.model}` : t('ordering.not-assigned');
});
const mapUrl = computed(() => mapEmbedUrl(order.value?.deliveryAddress));

const formatDate = (val) => val ? fmtDate(val, locale.value) : t('ordering.not-available');

async function openAssign() {
  const resources = await listAvailableResources(iamStore.currentProviderId);
  availableDrivers.value = resources.drivers;
  availableVehicles.value = resources.vehicles;
  selectedDriver.value = resources.drivers[0]?.id ?? null;
  selectedVehicle.value = resources.vehicles[0]?.id ?? null;
  assignVisible.value = true;
}

// ── Cancel accepted order ────────────────────────────────────────────────────
const cancelVisible = ref(false);
const cancelReason = ref('NO_STOCK');
const cancelNote = ref('');
const cancelling = ref(false);
const cancelReasonOptions = computed(() => [
  { label: t('ordering.cancel-reason-no-stock'),  value: 'NO_STOCK' },
  { label: t('ordering.cancel-reason-logistics'), value: 'LOGISTICS' },
  { label: t('ordering.cancel-reason-other'),     value: 'OTHER' },
]);

function openCancel() {
  cancelReason.value = 'NO_STOCK';
  cancelNote.value = '';
  cancelVisible.value = true;
}

async function confirmCancel() {
  cancelling.value = true;
  const base = cancelReasonOptions.value.find(o => o.value === cancelReason.value)?.label ?? '';
  const reason = cancelReason.value === 'OTHER' && cancelNote.value.trim() ? cancelNote.value.trim() : base;
  const result = await cancelAcceptedOrder({ order: order.value, reason });
  cancelling.value = false;
  cancelVisible.value = false;
  if (result?.ok) {
    toast.add({ severity: 'info', summary: t('ordering.cancel-done'), life: 3500 });
  } else {
    toast.add({ severity: 'warn', summary: t('common.error'), life: 3500 });
  }
}

async function confirmAssign() {
  if (!selectedDriver.value || !selectedVehicle.value) return;
  assigning.value = true;
  const result = await assignDelivery({ order: order.value, driverId: selectedDriver.value, vehicleId: selectedVehicle.value });
  assigning.value = false;

  if (!result?.ok) {
    toast.add({ severity: 'error', summary: t('ordering.dispatch-no-stock'), detail: t('ordering.dispatch-no-stock-detail'), life: 5000 });
    return;
  }

  // refresh assigned names
  const all = await listAllResources(iamStore.currentProviderId);
  allDrivers.value = all.drivers;
  allVehicles.value = all.vehicles;
  assignVisible.value = false;
  toast.add({ severity: 'success', summary: t('ordering.dispatch-done'), life: 3000 });
}
</script>

<template>
  <div class="detail-wrap">
    <div class="back-row">
      <pv-button :label="t('ordering.back')" icon="pi pi-arrow-left" text class="back-btn" @click="router.back()" />
      <h1 class="page-title">{{ t('ordering.order-detail-title') }}</h1>
    </div>

    <pv-message v-if="store.ordersLoaded && !order" severity="warn" class="not-found-card">
      {{ t('common.no-data') }}
    </pv-message>

    <div v-else-if="store.loading && !order" class="loading-row">
      <i class="pi pi-spin pi-spinner"/> {{ t('common.loading') }}
    </div>

    <div v-else-if="order" class="detail-grid">
      <!-- Left: order data -->
      <pv-card class="detail-card">
        <template #content>
          <div class="card-header">
            <span class="order-id">#FT-{{ String(order.id).padStart(3, '0') }}</span>
            <pv-tag :value="statusLabel" :severity="statusSeverity" class="status-badge"/>
          </div>

          <div class="card-divider"/>

          <div class="fields-grid">
            <div class="field-block">
              <span class="field-label">{{ t('ordering.col-client-label') }}</span>
              <span class="field-value">{{ buyerName }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.col-request-ref-label') }}</span>
              <span class="field-value">#{{ order.requestId ?? t('ordering.not-available') }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.col-product-label') }}</span>
              <span class="field-value">{{ fuelTypeLabel(order.fuelType) }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.col-quantity-label') }}</span>
              <span class="field-value highlight">{{ order.quantity }} {{ unitSuffix(order.unit) }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.col-total-label') }}</span>
              <span class="field-value highlight">{{ money(order.totalAmount) }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.driver') }}</span>
              <span class="field-value">{{ driverName }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.vehicle') }}</span>
              <span class="field-value">{{ vehicleLabel }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.col-created-label') }}</span>
              <span class="field-value">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="field-block">
              <span class="field-label">{{ t('ordering.col-delivery-date-label') }}</span>
              <span class="field-value">{{ order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate) : t('ordering.not-available') }}</span>
            </div>
            <div class="field-block full-width">
              <span class="field-label">{{ t('ordering.col-delivery-address-label') }}</span>
              <span class="field-value">{{ order.deliveryAddress || t('ordering.not-available') }}</span>
            </div>
          </div>

          <div class="card-divider"/>

          <div class="card-footer">
            <template v-if="order.status === 'ACCEPTED'">
              <pv-button
                  :label="t('ordering.cancel-order')"
                  icon="pi pi-times"
                  severity="danger"
                  outlined
                  class="action-btn"
                  @click="openCancel"
              />
              <pv-button
                  :label="t('ordering.assign')"
                  icon="pi pi-send"
                  class="action-btn dispatch-btn"
                  @click="openAssign"
              />
            </template>
            <div v-else-if="order.status === 'CANCELLED'" class="waiting-msg cancelled">
              <i class="pi pi-ban"/> {{ t('ordering.status-CANCELLED') }}<span v-if="order.cancelReason"> · {{ order.cancelReason }}</span>
            </div>
            <div v-else-if="order.status === 'DISPATCHED'" class="waiting-msg">
              <i class="pi pi-clock"/> {{ t('ordering.waiting-confirmation') }}
            </div>
            <div v-else-if="order.status === 'PENDING_PAYMENT'" class="waiting-msg paid">
              <i class="pi pi-wallet"/> {{ t('ordering.waiting-payment') }}
            </div>
            <div v-else class="waiting-msg done">
              <i class="pi pi-check-circle"/> {{ t('ordering.completed') }}
            </div>
          </div>
        </template>
      </pv-card>

      <!-- Right: simulated delivery map -->
      <pv-card class="map-card">
        <template #content>
          <div class="map-title"><i class="pi pi-map-marker"/> {{ t('ordering.delivery-location') }}</div>
          <div class="map-address">{{ order.deliveryAddress }}</div>
          <div class="map-frame">
            <iframe
                :src="mapUrl"
                width="100%" height="280" style="border:0; border-radius:10px"
                loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                :title="t('ordering.delivery-location')"
            />
          </div>
          <p class="map-note">{{ t('ordering.map-note') }}</p>
        </template>
      </pv-card>
    </div>

    <!-- Assign driver & vehicle (Fulfillment) before dispatch -->
    <pv-dialog v-model:visible="assignVisible" modal :header="t('ordering.assign-title')" :style="{ width: '420px' }">
      <div class="assign-field">
        <label>{{ t('ordering.driver') }}</label>
        <pv-select v-model="selectedDriver" :options="availableDrivers" option-label="name" option-value="id" class="w-full" :placeholder="t('ordering.driver')"/>
      </div>
      <div class="assign-field">
        <label>{{ t('ordering.vehicle') }}</label>
        <pv-select v-model="selectedVehicle" :options="availableVehicles" option-value="id" class="w-full" :placeholder="t('ordering.vehicle')">
          <template #value="{ value }">
            <span v-if="value">{{ availableVehicles.find(v => v.id === value)?.plate }} · {{ availableVehicles.find(v => v.id === value)?.brand }}</span>
          </template>
          <template #option="{ option }">{{ option.plate }} · {{ option.brand }} {{ option.model }}</template>
        </pv-select>
      </div>
      <pv-message v-if="!availableDrivers.length || !availableVehicles.length" severity="warn" :closable="false">
        {{ t('ordering.no-resources') }}
      </pv-message>
      <template #footer>
        <pv-button :label="t('common.cancel')" text @click="assignVisible = false"/>
        <pv-button :label="t('ordering.dispatch')" icon="pi pi-send" :disabled="!selectedDriver || !selectedVehicle || assigning" @click="confirmAssign"/>
      </template>
    </pv-dialog>

    <!-- Cancel accepted order (releases the stock reservation) -->
    <pv-dialog v-model:visible="cancelVisible" modal :header="t('ordering.cancel-order')" :style="{ width: '440px' }">
      <div class="cancel-form">
        <p class="cancel-intro">{{ t('ordering.cancel-intro') }}</p>
        <label class="cancel-lbl">{{ t('ordering.cancel-reason') }}</label>
        <pv-select v-model="cancelReason" :options="cancelReasonOptions" option-label="label" option-value="value" class="w-full"/>
        <template v-if="cancelReason === 'OTHER'">
          <label class="cancel-lbl">{{ t('ordering.cancel-note') }}</label>
          <pv-textarea v-model="cancelNote" rows="2" class="w-full"/>
        </template>
      </div>
      <template #footer>
        <pv-button :label="t('common.cancel')" text @click="cancelVisible = false"/>
        <pv-button :label="t('ordering.cancel-order')" icon="pi pi-times" severity="danger" :disabled="cancelling" @click="confirmCancel"/>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.detail-wrap { display: flex; flex-direction: column; gap: 1rem; }
.back-row { display: flex; align-items: center; gap: 1rem; margin-bottom: .5rem; }
.back-btn { color: #6B7280; }
.page-title { font-size: 1.6rem; font-weight: 700; color: #1E3A8A; margin: 0; }

.loading-row { color: #6B7280; display: flex; align-items: center; gap: 0.5rem; padding: 2rem 0; }
.not-found-card { background: #fff; border-radius: 8px; padding: 3rem; text-align: center; }

.detail-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.25rem; align-items: start; }

.detail-card { border-radius: 12px; }
.detail-card :deep(.p-card-body) { padding: 1.5rem 1.75rem; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.order-id { font-family: monospace; font-size: 1.05rem; font-weight: 700; color: #1f2937; }
.card-divider { border: none; border-top: 1px solid #E5E7EB; margin: 1rem 0; }
.status-badge { font-size: 0.82rem; font-weight: 600; }

.fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 1.5rem; }
.field-block.full-width { grid-column: 1 / -1; }
.field-label { display: block; font-size: 0.72rem; font-weight: 600; color: #9CA3AF; letter-spacing: 0.05em; margin-bottom: 0.25rem; text-transform: uppercase; }
.field-value { font-size: 0.95rem; color: #374151; }
.field-value.highlight { font-weight: 700; color: #1E3A8A; }

.card-footer { display: flex; justify-content: flex-end; gap: 10px; }
.action-btn { font-weight: 600; font-size: 0.9rem; padding: 0.6rem 1.4rem; border-radius: 8px; }
.dispatch-btn { background: #DBEAFE; color: #1D4ED8; }
.dispatch-btn:hover { background: #BFDBFE; }
.waiting-msg { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #b45309; background: #fef3c7; padding: 10px 16px; border-radius: 8px; width: 100%; justify-content: center; }
.waiting-msg.paid { color: #6d28d9; background: #ede9fe; }
.waiting-msg.done { color: #059669; background: #d1fae5; }
.waiting-msg.cancelled { color: #b91c1c; background: #fee2e2; }

.cancel-form { display: flex; flex-direction: column; gap: 8px; }
.cancel-intro { margin: 0 0 4px; color: #64748b; font-size: .88rem; }
.cancel-lbl { font-size: .8rem; font-weight: 600; color: #475569; margin-top: 4px; }

.map-card { border-radius: 12px; }
.map-card :deep(.p-card-body) { padding: 1.25rem 1.5rem; }
.map-title { font-weight: 700; color: #1a2744; display: flex; align-items: center; gap: 8px; }
.map-title i { color: #dc2626; }
.map-address { font-size: .85rem; color: #64748b; margin: 4px 0 12px; }
.map-frame { border-radius: 10px; overflow: hidden; }
.map-note { font-size: .75rem; color: #94a3b8; margin: 10px 0 0; }

.assign-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.assign-field label { font-size: .82rem; font-weight: 600; color: #475569; }
.w-full { width: 100%; }

@media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
</style>
