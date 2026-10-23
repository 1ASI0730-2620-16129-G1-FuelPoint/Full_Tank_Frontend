<script setup>
/**
 * Provider orders page. Lists the provider's orders as horizontal cards
 * referencing the buyer company name, with a link to the order detail.
 */
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import useOrderingStore from '../../application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import { money, unitSuffix } from '../../../shared/domain/helpers.js';
import pinia from '../../../pinia.js';

const router  = useRouter();
const { t }   = useI18n();
const store   = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);

onMounted(() => {
  store.clearErrors();
  if (!store.ordersLoaded) store.fetchOrders();
  if (!iamStore.buyerCompanies.length) iamStore.fetchDirectories();
});

const orders = computed(() =>
  [...store.ordersForProvider(iamStore.currentProviderId)]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
);

function buyerName(id) {
  return iamStore.buyerCompanies.find(c => c.id === id)?.name ?? `Company #${id}`;
}
const viewOrder = (id) => router.push({ name: 'ordering-order-detail', params: { id } });
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">{{ t('ordering.order-list-title') }}</h1>
        <p class="page-subtitle">{{ t('ordering.order-list-subtitle') }}</p>
      </div>
      <pv-button icon="pi pi-refresh" text rounded class="refresh-btn" :loading="store.loading" @click="store.fetchOrders()"/>
    </div>

    <pv-message v-if="store.errors.length" severity="error" class="error-banner">
      {{ t('errors.fetch') }}: {{ store.errors[0]?.message || t('errors.unknown') }}
    </pv-message>

    <div v-if="!orders.length && !store.loading" class="empty-state">
      <i class="pi pi-truck"/>
      <p>{{ t('ordering.no-orders') }}</p>
    </div>

    <div v-else class="order-cards">
      <div v-for="order in orders" :key="order.id" class="order-card" @click="viewOrder(order.id)">
        <div class="oc-left">
          <span class="oc-id">#FT-{{ String(order.id).padStart(3, '0') }}</span>
          <span class="oc-company">{{ buyerName(order.companyId ?? order.clientId) }}</span>
          <span class="fuel-chip">{{ fuelTypeLabel(order.fuelType) }}</span>
        </div>

        <div class="oc-mid">
          <div class="oc-field">
            <span class="oc-label">{{ t('ordering.col-quantity') }}</span>
            <span class="oc-value">{{ order.quantity }} {{ unitSuffix(order.unit) }}</span>
          </div>
          <div class="oc-field">
            <span class="oc-label">{{ t('ordering.col-total') }}</span>
            <span class="oc-value strong">{{ money(order.totalAmount) }}</span>
          </div>
          <div class="oc-field">
            <span class="oc-label">{{ t('ordering.col-address') }}</span>
            <span class="oc-value">{{ order.deliveryAddress?.split(',')[0] }}</span>
          </div>
          <div class="oc-field">
            <span class="oc-label">{{ t('common.status') }}</span>
            <pv-tag :value="t('ordering.status-' + order.status)" :severity="orderStatusSeverity(order.status)"/>
          </div>
        </div>

        <div class="oc-actions">
          <pv-button :label="t('ordering.view-detail')" icon="pi pi-arrow-right" icon-pos="right" size="small" outlined @click.stop="viewOrder(order.id)"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1rem; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { font-size: 1.6rem; font-weight: 700; color: #1E3A8A; margin: 0; }
.page-subtitle { color: #6B7280; font-size: 0.9rem; margin: 0.25rem 0 0; }
.refresh-btn { color: #1E3A8A; }
.error-banner { margin-bottom: .5rem; }

.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: .75rem; }

.order-cards { display: flex; flex-direction: column; gap: 12px; }
.order-card {
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 22px;
  cursor: pointer; transition: box-shadow .15s;
}
.order-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }

.oc-left { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
.oc-id { font-family: monospace; font-weight: 700; color: #1e3a8a; }
.oc-company { font-weight: 700; color: #1a2744; font-size: 1rem; }
.fuel-chip { align-self: flex-start; background: #eff6ff; color: #1e3a8a; border-radius: 6px; padding: 2px 10px; font-size: .74rem; font-weight: 600; }

.oc-mid { display: flex; align-items: center; gap: 36px; flex: 1; flex-wrap: wrap; }
.oc-field { display: flex; flex-direction: column; gap: 4px; }
.oc-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .4px; color: #94a3b8; }
.oc-value { font-weight: 600; color: #1a2744; }
.oc-value.strong { color: #1e3a8a; font-size: 1.05rem; }

.oc-actions { display: flex; gap: 8px; align-items: center; min-width: 160px; justify-content: flex-end; }

@media (max-width: 900px) {
  .order-card { flex-direction: column; align-items: stretch; }
  .oc-actions { justify-content: flex-start; }
}
</style>
