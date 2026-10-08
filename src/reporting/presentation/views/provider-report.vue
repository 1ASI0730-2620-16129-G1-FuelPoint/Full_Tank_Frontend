<script setup>
/**
 * Unified provider Reporting & Analytics page. Merges the former "General
 * Reports" and "Customer Reports" into a single screen, dropping redundant
 * metrics (avg. compliance rate, avg. lead time, sales performance by customer).
 * Styled to match the buyer report.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Chart from 'primevue/chart';
import useOrderingStore from '../../../ordering/application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import useAnalyticsStore from '../../application/analytics.store.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { money } from '../../../shared/domain/helpers.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import {
  financialDate,
  isPaidOrder,
  ordersInPeriod,
} from '../../domain/financial-period.js';
import pinia from '../../../pinia.js';

const { t, locale } = useI18n();
const orderingStore = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);
const analyticsStore = useAnalyticsStore(pinia);

onMounted(async () => {
  if (!orderingStore.ordersLoaded) orderingStore.fetchOrders();
  if (!orderingStore.requestsLoaded) orderingStore.fetchRequests();
  if (!iamStore.buyerCompanies.length) iamStore.fetchDirectories();
  await analyticsStore.fetchProviderReport(iamStore.currentProviderId, selectedYear.value, selectedMonth.value);
});

const PALETTE = ['#2563eb', '#059669', '#f59e0b', '#dc2626', '#6366f1', '#0ea5e9', '#a855f7', '#14b8a6'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const providerOrders = computed(() => orderingStore.ordersForProvider(iamStore.currentProviderId));
const providerRequests = computed(() => orderingStore.requestsForProvider(iamStore.currentProviderId));
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(null);
const availableYears = computed(() => {
  const orderYears = providerOrders.value.map(financialDate).filter(Boolean).map(date => date.getFullYear());
  const requestYears = providerRequests.value
      .map(request => request.createdAt ? new Date(request.createdAt) : null)
      .filter(date => date && !Number.isNaN(date.getTime()))
      .map(date => date.getFullYear());
  return [...new Set([now.getFullYear(), ...orderYears, ...requestYears])].sort((a, b) => b - a);
});
const yearOptions = computed(() => availableYears.value.map(year => ({ label: String(year), value: year })));
const monthOptions = computed(() => [
  { label: t('reporting.filters.all-months'), value: null },
  ...Array.from({ length: 12 }, (_, month) => ({
    label: new Date(2000, month, 1).toLocaleDateString(locale.value, { month: 'long' }),
    value: month,
  })),
]);
watch([selectedYear, selectedMonth], ([year, month]) =>
    analyticsStore.fetchProviderReport(iamStore.currentProviderId, year, month));
const periodOrders = computed(() => ordersInPeriod(providerOrders.value, selectedYear.value, selectedMonth.value));
const paidOrders = computed(() => periodOrders.value.filter(isPaidOrder));
const periodRequests = computed(() => providerRequests.value.filter(request => {
  if (!request.createdAt) return false;
  const date = new Date(request.createdAt);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(selectedYear.value)) return false;
  return selectedMonth.value == null || date.getMonth() === Number(selectedMonth.value);
}));
const hasOrders = computed(() => (analyticsStore.providerReport?.byStatus ?? [])
    .some(point => Number(point.count) > 0));

const buyerName = (id) => iamStore.buyerCompanies.find(c => c.id === id)?.name ?? `#${id}`;
const buyerSector = (id) => iamStore.buyerCompanies.find(c => c.id === id)?.sector ?? '—';

// Customers aggregated from the provider's OWN orders (real data).
const customerAgg = computed(() => {
  const map = {};
  paidOrders.value.forEach(o => {
    const id = o.companyId ?? o.clientId;
    if (!map[id]) map[id] = { companyId: id, companyName: buyerName(id), sector: buyerSector(id), totalVolume: 0, totalCost: 0, paidAll: true };
    map[id].totalVolume += Number(o.quantity || 0);
    map[id].totalCost += Number(o.totalAmount || 0);
  });
  return Object.values(map).map(c => ({ ...c, status: 'PAID' }));
});

const totalRevenue = computed(() => analyticsStore.providerReport?.summary?.totalRevenue ?? 0);
const totalOrders = computed(() => (analyticsStore.providerReport?.byStatus ?? [])
    .reduce((sum, point) => sum + Number(point.count), 0));
const paidOrdersCount = computed(() => analyticsStore.providerReport?.summary?.totalOrders ?? 0);
const rejectedCount = computed(() => periodRequests.value.filter(r => r.status === 'REJECTED').length);
const totalCustomers = computed(() => analyticsStore.providerReport?.topCustomers?.length ?? 0);

// Revenue over time, from the provider's own orders by month.
const salesChart = computed(() => {
  const points = analyticsStore.providerReport?.trend ?? [];
  return {
    labels: points.map(point => point.label),
    datasets: [{ label: 'Revenue', data: points.map(point => Number(point.amount)), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: 0.35 }],
  };
});

// Orders by status
const statusChart = computed(() => {
  const points = analyticsStore.providerReport?.byStatus ?? [];
  return {
    labels: points.map(point => t('ordering.status-' + point.status)),
    datasets: [{ data: points.map(point => Number(point.count)), backgroundColor: PALETTE }],
  };
});

// Best-selling fuel (by revenue)
const fuelChart = computed(() => {
  const points = analyticsStore.providerReport?.byFuel ?? [];
  return {
    labels: points.map(point => fuelTypeLabel(point.fuelType)),
    datasets: [{ data: points.map(point => Number(point.revenue)), backgroundColor: PALETTE, borderRadius: 6 }],
  };
});

// Customers by sector, weighted by real revenue from this provider's orders.
const sectorChart = computed(() => {
  const points = analyticsStore.providerReport?.bySector ?? [];
  return { labels: points.map(point => point.sector), datasets: [{ data: points.map(point => Number(point.count)), backgroundColor: PALETTE }] };
});

// Top customers by revenue (real)
const topCustomers = computed(() => (analyticsStore.providerReport?.topCustomers ?? []).map(customer => {
  const local = customerAgg.value.find(item => Number(item.companyId) === Number(customer.companyId));
  return {
    companyId: customer.companyId,
    companyName: customer.companyName,
    sector: buyerSector(customer.companyId),
    totalVolume: local?.totalVolume ?? 0,
    totalCost: customer.totalPurchased,
  };
}));

const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
</script>

<template>
  <div class="report-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('reporting.provider.title') }}</h1>
        <p class="page-subtitle">{{ t('reporting.provider.subtitle') }}</p>
      </div>
      <div class="period-filters">
        <pv-select v-model="selectedYear" :options="yearOptions" option-label="label" option-value="value" :placeholder="t('reporting.filters.year')"/>
        <pv-select v-model="selectedMonth" :options="monthOptions" option-label="label" option-value="value" :placeholder="t('reporting.filters.month')"/>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.provider.kpi-revenue') }}</span><span class="kpi-num">{{ money(totalRevenue) }}</span></div>
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.provider.kpi-orders') }}</span><span class="kpi-num">{{ totalOrders }}</span></div>
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.provider.kpi-paid') }}</span><span class="kpi-num">{{ paidOrdersCount }}</span></div>
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.provider.kpi-rejected') }}</span><span class="kpi-num">{{ rejectedCount }}</span></div>
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.provider.kpi-customers') }}</span><span class="kpi-num">{{ totalCustomers }}</span></div>
    </div>

    <div v-if="!hasOrders" class="report-empty">
      <i class="pi pi-chart-line"/>
      <p class="re-title">{{ t('reporting.provider.empty-title') }}</p>
      <p class="re-hint">{{ t('reporting.provider.empty-hint') }}</p>
      <pv-button :label="t('reporting.provider.empty-cta')" icon="pi pi-inbox" @click="$router.push('/ordering/pending')"/>
    </div>

    <template v-else>
    <div class="chart-grid">
      <pv-card class="chart-card">
        <template #content>
          <div class="chart-title">{{ t('reporting.provider.sales-over-time') }}</div>
          <div class="chart-box"><Chart type="line" :data="salesChart" :options="lineOptions" style="height:240px"/></div>
        </template>
      </pv-card>
      <pv-card class="chart-card">
        <template #content>
          <div class="chart-title">{{ t('reporting.provider.orders-by-status') }}</div>
          <div class="chart-box"><Chart type="doughnut" :data="statusChart" :options="doughnutOptions" style="height:240px"/></div>
        </template>
      </pv-card>
    </div>

    <div class="chart-grid">
      <pv-card class="chart-card">
        <template #content>
          <div class="chart-title">{{ t('reporting.provider.best-fuel') }}</div>
          <div class="chart-box"><Chart type="bar" :data="fuelChart" :options="barOptions" style="height:240px"/></div>
        </template>
      </pv-card>
      <pv-card class="chart-card">
        <template #content>
          <div class="chart-title">{{ t('reporting.provider.by-segment') }}</div>
          <div class="chart-box"><Chart type="doughnut" :data="sectorChart" :options="doughnutOptions" style="height:240px"/></div>
        </template>
      </pv-card>
    </div>

    <pv-card class="chart-card">
      <template #content>
        <div class="chart-title">{{ t('reporting.provider.top-customers') }}</div>
        <pv-data-table :value="topCustomers" striped-rows class="mt">
          <pv-column :header="t('reporting.provider.col-customer')">
            <template #body="{ data }">{{ data.companyName }}</template>
          </pv-column>
          <pv-column :header="t('reporting.provider.col-sector')">
            <template #body="{ data }"><pv-tag :value="data.sector" severity="secondary"/></template>
          </pv-column>
          <pv-column :header="t('reporting.provider.col-volume')">
            <template #body="{ data }">{{ Number(data.totalVolume).toLocaleString() }}</template>
          </pv-column>
          <pv-column :header="t('reporting.provider.col-revenue')">
            <template #body="{ data }">{{ money(data.totalCost) }}</template>
          </pv-column>
          <pv-column :header="t('common.status')">
            <template #body="{ data }"><pv-tag :value="data.status" :severity="data.status === 'PAID' ? 'success' : 'warn'"/></template>
          </pv-column>
          <template #empty><div class="empty-row">{{ t('common.no-data') }}</div></template>
        </pv-data-table>
      </template>
    </pv-card>
    </template>
  </div>
</template>

<style scoped>
.report-page { display: flex; flex-direction: column; gap: 20px; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.period-filters { display: flex; gap: 10px; }
.period-filters :deep(.p-select) { min-width: 150px; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.kpi-lbl { font-size: .74rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; }
.kpi-num { font-size: 1.5rem; font-weight: 700; color: #1a2744; }

.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-title { font-size: 1rem; font-weight: 600; color: #1a2744; margin-bottom: 12px; }
.chart-box { height: 240px; }
.mt { margin-top: 6px; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem; }
.report-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 4rem 2rem; text-align: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; color: #94a3b8; }
.report-empty i { font-size: 2.4rem; color: #cbd5e1; }
.re-title { font-weight: 700; color: #475569; margin: 6px 0 0; font-size: 1.05rem; }
.re-hint { margin: 0 0 8px; max-width: 420px; }

@media (max-width: 900px) { .chart-grid { grid-template-columns: 1fr; } }
</style>
