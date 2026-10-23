<script setup>
/**
 * Provider collections page. A read-only financial view over the provider's own
 * orders: how much is still to be collected (delivered, awaiting payment) versus
 * already collected (paid). Reuses the Ordering read model — no new domain logic.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import useOrderingStore from '../../application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import { money, unitSuffix, formatDate as fmtDate } from '../../../shared/domain/helpers.js';
import pinia from '../../../pinia.js';

const { t, locale } = useI18n();
const store = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);

onMounted(() => {
  if (!store.ordersLoaded) store.fetchOrders();
  if (!iamStore.buyerCompanies.length) iamStore.fetchDirectories();
});

const isReceivable = (o) => o.status === 'PENDING_PAYMENT';
const isCollected = (o) => o.status === 'PAID' || o.status === 'CLOSED';

const providerOrders = computed(() => store.ordersForProvider(iamStore.currentProviderId));
const receivable = computed(() => providerOrders.value.filter(isReceivable));
const collected = computed(() => providerOrders.value.filter(isCollected));

const totalReceivable = computed(() => receivable.value.reduce((s, o) => s + Number(o.totalAmount || 0), 0));
const totalCollected = computed(() => collected.value.reduce((s, o) => s + Number(o.totalAmount || 0), 0));

const filter = ref('receivable');
const filterOptions = computed(() => [
  { label: t('collections.filter-receivable'), value: 'receivable' },
  { label: t('collections.filter-collected'), value: 'collected' },
  { label: t('collections.filter-all'), value: 'all' },
]);

// Client filter (null = all clients).
const clientFilter = ref(null);
const clientOptions = computed(() => {
  const seen = new Map();
  providerOrders.value.forEach(o => {
    const id = o.companyId ?? o.clientId;
    if (!seen.has(id)) seen.set(id, { label: buyerName(id), value: id });
  });
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
});

const rows = computed(() => {
  let list = filter.value === 'receivable' ? receivable.value
    : filter.value === 'collected' ? collected.value
    : [...receivable.value, ...collected.value];
  if (clientFilter.value != null) {
    list = list.filter(o => (o.companyId ?? o.clientId) === clientFilter.value);
  }
  return [...list].sort((a, b) => new Date(b.deliveredAt ?? b.createdAt) - new Date(a.deliveredAt ?? a.createdAt));
});

function buyerName(id) {
  return iamStore.buyerCompanies.find(c => c.id === id)?.name ?? `Company #${id}`;
}
const formatDate = (val) => val ? fmtDate(val, locale.value) : '—';

// Client-side CSV export of the current (filtered) collections view. No backend.
function exportCsv() {
  const headers = ['Order', 'Customer', 'Fuel', 'Total', 'Status', 'Date'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.value.map(o => [
    `FT-${String(o.id).padStart(3, '0')}`,
    buyerName(o.companyId ?? o.clientId),
    fuelTypeLabel(o.fuelType),
    Number(o.totalAmount || 0).toFixed(2),
    o.status,
    formatDate(o.deliveredAt ?? o.createdAt),
  ].map(escape).join(','));
  const csv = [headers.map(escape).join(','), ...lines].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `collections-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('collections.title') }}</h1>
        <p class="page-subtitle">{{ t('collections.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <pv-button icon="pi pi-refresh" text rounded :loading="store.loading" @click="store.fetchOrders()"/>
        <pv-button :label="t('collections.export')" icon="pi pi-download" outlined size="small" :disabled="!rows.length" @click="exportCsv"/>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi receivable">
        <span class="kpi-lbl">{{ t('collections.kpi-receivable') }}</span>
        <span class="kpi-num">{{ money(totalReceivable) }}</span>
        <span class="kpi-sub">{{ receivable.length }} {{ t('collections.kpi-pending-count') }}</span>
      </div>
      <div class="kpi collected">
        <span class="kpi-lbl">{{ t('collections.kpi-collected') }}</span>
        <span class="kpi-num">{{ money(totalCollected) }}</span>
        <span class="kpi-sub">{{ collected.length }} {{ t('collections.filter-collected') }}</span>
      </div>
    </div>

    <div class="filter-row">
      <pv-select-button v-model="filter" :options="filterOptions" option-label="label" option-value="value" :allow-empty="false"/>
      <pv-select
          v-model="clientFilter"
          :options="clientOptions"
          option-label="label"
          option-value="value"
          show-clear
          :placeholder="t('collections.filter-client')"
          class="client-select"
      />
    </div>

    <pv-card>
      <template #content>
        <pv-data-table :value="rows" :loading="store.loading" striped-rows>
          <pv-column :header="t('collections.col-order')">
            <template #body="{ data }"><span class="mono">#FT-{{ String(data.id).padStart(3, '0') }}</span></template>
          </pv-column>
          <pv-column :header="t('collections.col-customer')">
            <template #body="{ data }">{{ buyerName(data.companyId ?? data.clientId) }}</template>
          </pv-column>
          <pv-column :header="t('collections.col-fuel')">
            <template #body="{ data }">{{ fuelTypeLabel(data.fuelType) }}</template>
          </pv-column>
          <pv-column :header="t('collections.col-total')">
            <template #body="{ data }"><strong>{{ money(data.totalAmount) }}</strong></template>
          </pv-column>
          <pv-column :header="t('collections.col-date')">
            <template #body="{ data }">{{ formatDate(data.deliveredAt ?? data.createdAt) }}</template>
          </pv-column>
          <pv-column :header="t('common.status')">
            <template #body="{ data }"><pv-tag :value="t('ordering.status-' + data.status)" :severity="orderStatusSeverity(data.status)"/></template>
          </pv-column>
          <template #empty><div class="empty-row">{{ t('collections.empty') }}</div></template>
        </pv-data-table>
      </template>
    </pv-card>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; border-left: 4px solid #e5e7eb; }
.kpi.receivable { border-left-color: #f59e0b; }
.kpi.collected { border-left-color: #059669; }
.kpi-lbl { font-size: .74rem; text-transform: uppercase; letter-spacing: .4px; color: #94a3b8; font-weight: 600; }
.kpi-num { font-size: 1.7rem; font-weight: 700; color: #1a2744; }
.kpi-sub { font-size: .8rem; color: #94a3b8; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.client-select { min-width: 220px; }
.mono { font-family: monospace; font-weight: 700; color: #1e3a8a; }
.empty-row { text-align: center; color: #94a3b8; padding: 2.5rem; }
</style>
