<script setup>
/**
 * Buyer order detail & tracking page. Gives the buyer a full follow-up of an
 * order after approval: a status timeline, delivery address + estimated date,
 * assigned driver/vehicle, a keyless map preview and the contextual action
 * (confirm reception when dispatched, pay when pending payment). Read-only with
 * respect to other bounded contexts — actions go through the coordination layer.
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import useOrderingStore from '../../application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { confirmOrderReception, listAllResources } from '../../../shared/application/coordination.service.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import { mapEmbedUrl, money, unitSuffix, formatDate as fmtDate } from '../../../shared/domain/helpers.js';
import pinia from '../../../pinia.js';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const store = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);

const allDrivers = ref([]);
const allVehicles = ref([]);

onMounted(async () => {
  if (!store.ordersLoaded) await store.fetchOrders();
  if (!iamStore.providerCompanies.length) await iamStore.fetchDirectories();
  const all = await listAllResources(order.value?.providerId);
  allDrivers.value = all.drivers;
  allVehicles.value = all.vehicles;
});

const order = computed(() => store.getOrderById(route.params.id));

const providerName = computed(() =>
  iamStore.providerCompanies.find(p => p.id === order.value?.providerId)?.name ?? `Provider #${order.value?.providerId ?? '—'}`
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

// ── Status timeline ─────────────────────────────────────────────────────────
const STEPS = [
  { key: 'ACCEPTED',        icon: 'pi pi-check-circle', at: 'createdAt' },
  { key: 'DISPATCHED',      icon: 'pi pi-truck',        at: 'dispatchedAt' },
  { key: 'PENDING_PAYMENT', icon: 'pi pi-wallet',       at: 'deliveredAt' },
  { key: 'PAID',            icon: 'pi pi-verified',     at: 'paidAt' },
];
const currentIndex = computed(() => {
  const s = order.value?.status;
  if (s === 'CLOSED') return STEPS.length; // everything done
  const i = STEPS.findIndex(step => step.key === s);
  return i === -1 ? 0 : i;
});
function stepState(i) {
  if (i < currentIndex.value) return 'done';
  if (i === currentIndex.value) return 'current';
  return 'pending';
}
// Date stamp for each timeline step, or "Pending" if it hasn't happened yet.
function stepDate(step) {
  const ts = order.value?.[step.at];
  return ts ? fmtDate(ts, locale.value) : t('ordering.timeline-pending');
}

function confirmReception() {
  confirm.require({
    message: t('ordering.confirm-reception-msg', { id: order.value.id }),
    header: t('ordering.confirm-reception'),
    icon: 'pi pi-check-circle',
    acceptClass: 'p-button-success',
    accept: async () => {
      await confirmOrderReception({ order: order.value });
      toast.add({ severity: 'success', summary: t('ordering.reception-done'), detail: t('ordering.reception-done-detail'), life: 4000 });
    },
  });
}
</script>

<template>
  <div class="detail-wrap">
    <div class="back-row">
      <pv-button :label="t('ordering.back')" icon="pi pi-arrow-left" text class="back-btn" @click="router.push('/ordering/my-orders')"/>
      <h1 class="page-title">{{ t('ordering.order-detail-title') }}</h1>
    </div>

    <pv-message v-if="store.ordersLoaded && !order" severity="warn" class="not-found-card">
      {{ t('common.no-data') }}
    </pv-message>

    <template v-else-if="order">
      <!-- Timeline -->
      <pv-card class="tl-card">
        <template #content>
          <div class="tl-head">
            <div>
              <span class="tl-id">#FT-{{ String(order.id).padStart(3, '0') }}</span>
              <pv-tag :value="t('ordering.status-' + order.status)" :severity="orderStatusSeverity(order.status)"/>
            </div>
          </div>
          <div class="timeline">
            <div v-for="(step, i) in STEPS" :key="step.key" class="tl-step" :class="stepState(i)">
              <div class="tl-dot"><i :class="step.icon"/></div>
              <span class="tl-label">{{ t('ordering.status-' + step.key) }}</span>
              <span class="tl-date">{{ stepDate(step) }}</span>
              <div v-if="i < STEPS.length - 1" class="tl-bar"/>
            </div>
          </div>
        </template>
      </pv-card>

      <div class="grid">
        <!-- Detail -->
        <pv-card class="info-card">
          <template #content>
            <div class="fields-grid">
              <div class="fb"><span class="fl">{{ t('ordering.col-provider-label') }}</span><span class="fv">{{ providerName }}</span></div>
              <div class="fb"><span class="fl">{{ t('ordering.col-product-label') }}</span><span class="fv">{{ fuelTypeLabel(order.fuelType) }}</span></div>
              <div class="fb"><span class="fl">{{ t('ordering.col-quantity-label') }}</span><span class="fv hl">{{ order.quantity }} {{ unitSuffix(order.unit) }}</span></div>
              <div class="fb"><span class="fl">{{ t('ordering.col-total-label') }}</span><span class="fv hl">{{ money(order.totalAmount) }}</span></div>
              <div class="fb"><span class="fl">{{ t('ordering.driver') }}</span><span class="fv">{{ driverName }}</span></div>
              <div class="fb"><span class="fl">{{ t('ordering.vehicle') }}</span><span class="fv">{{ vehicleLabel }}</span></div>
              <div class="fb"><span class="fl">{{ t('ordering.col-delivery-date-label') }}</span><span class="fv">{{ formatDate(order.estimatedDeliveryDate) }}</span></div>
              <div class="fb"><span class="fl">{{ t('ordering.col-created-label') }}</span><span class="fv">{{ formatDate(order.createdAt) }}</span></div>
              <div class="fb full"><span class="fl">{{ t('ordering.col-delivery-address-label') }}</span><span class="fv">{{ order.deliveryAddress || t('ordering.not-available') }}</span></div>
            </div>

            <div class="actions">
              <pv-button
                  v-if="order.status === 'DISPATCHED'"
                  :label="t('ordering.confirm-reception')"
                  icon="pi pi-check"
                  severity="success"
                  @click="confirmReception"
              />
              <pv-button
                  v-else-if="order.status === 'PENDING_PAYMENT'"
                  :label="t('ordering.pay')"
                  icon="pi pi-credit-card"
                  @click="router.push('/payment')"
              />
              <span v-else-if="order.status === 'ACCEPTED'" class="hint">{{ t('ordering.awaiting-dispatch') }}</span>
              <span v-else class="hint done"><i class="pi pi-check-circle"/> {{ t('ordering.completed') }}</span>
            </div>
          </template>
        </pv-card>

        <!-- Map -->
        <pv-card class="map-card">
          <template #content>
            <div class="map-title">{{ t('ordering.delivery-location') }}</div>
            <iframe :src="mapUrl" :title="t('ordering.delivery-location')" width="100%" height="280" style="border:0;border-radius:10px" loading="lazy" referrerpolicy="no-referrer-when-downgrade"/>
            <div class="map-note">{{ order.deliveryAddress }} · {{ t('ordering.map-note') }}</div>
          </template>
        </pv-card>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-wrap { display: flex; flex-direction: column; gap: 18px; }
.back-row { display: flex; align-items: center; gap: 10px; }
.page-title { font-size: 22px; font-weight: 700; color: #1a2744; margin: 0; }
.not-found-card { margin-top: 8px; }

.tl-card { border-radius: 14px; }
.tl-head { display: flex; justify-content: space-between; margin-bottom: 18px; }
.tl-id { font-family: monospace; font-weight: 700; color: #1e3a8a; margin-right: 10px; }

.timeline { display: flex; align-items: flex-start; }
.tl-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.tl-dot { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; background: #eef2f7; color: #94a3b8; border: 2px solid #e5e7eb; z-index: 1; }
.tl-label { font-size: .78rem; color: #94a3b8; font-weight: 600; }
.tl-date { font-size: .68rem; color: #b6c0d4; }
.tl-step.done .tl-date, .tl-step.current .tl-date { color: #64748b; }
.tl-bar { position: absolute; top: 21px; left: 50%; width: 100%; height: 3px; background: #e5e7eb; z-index: 0; }
.tl-step.done .tl-dot { background: #dcfce7; color: #059669; border-color: #86efac; }
.tl-step.done .tl-label { color: #059669; }
.tl-step.done .tl-bar { background: #86efac; }
.tl-step.current .tl-dot { background: #1e3a8a; color: #fff; border-color: #1e3a8a; box-shadow: 0 0 0 4px rgba(30,58,138,.15); }
.tl-step.current .tl-label { color: #1e3a8a; }

.grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
.info-card, .map-card { border-radius: 14px; }
.fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
.fb { display: flex; flex-direction: column; gap: 3px; }
.fb.full { grid-column: span 2; }
.fl { font-size: .7rem; text-transform: uppercase; letter-spacing: .4px; color: #94a3b8; font-weight: 600; }
.fv { color: #1a2744; font-weight: 600; }
.fv.hl { color: #1e3a8a; font-size: 1.05rem; }

.actions { margin-top: 20px; padding-top: 16px; border-top: 1px solid #eef2f7; display: flex; justify-content: flex-end; }
.hint { font-size: .85rem; color: #94a3b8; }
.hint.done { color: #059669; display: flex; align-items: center; gap: 6px; }

.map-title { font-weight: 600; color: #1a2744; margin-bottom: 10px; }
.map-note { font-size: .76rem; color: #94a3b8; margin-top: 8px; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
  .tl-label { font-size: .68rem; }
}
</style>
