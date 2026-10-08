<script setup>
/**
 * Buyer Reporting & Analytics page. Builds read-only analytics from the buyer's
 * orders (Ordering read model) and equipment (Equipment read model). It only
 * consumes data — it never mutates other bounded contexts.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Chart from 'primevue/chart';
import useOrderingStore from '../../../ordering/application/ordering.store.js';
import useEquipmentStore from '../../../equipment/application/equipment.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import useAnalyticsStore from '../../application/analytics.store.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { unitSuffix } from '../../../shared/domain/helpers.js';
import {
  financialDate,
  isPaidOrder,
  ordersInPeriod,
} from '../../domain/financial-period.js';
import pinia from '../../../pinia.js';

const { t, locale } = useI18n();
const orderingStore = useOrderingStore(pinia);
const equipmentStore = useEquipmentStore(pinia);
const iamStore = useIamStore(pinia);
const analyticsStore = useAnalyticsStore(pinia);

onMounted(async () => {
  if (!orderingStore.ordersLoaded) orderingStore.fetchOrders();
  if (!equipmentStore.loaded) equipmentStore.fetchEquipment();
  if (!iamStore.providerCompanies.length) iamStore.fetchDirectories();
  await analyticsStore.fetchBuyerReport(iamStore.currentCompanyId, selectedYear.value, selectedMonth.value);
});

const orders = computed(() => orderingStore.ordersForBuyer(iamStore.currentCompanyId));
const equipment = computed(() => equipmentStore.forCompany(iamStore.currentCompanyId));
const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(null);
const availableYears = computed(() => {
  const years = orders.value
      .map(financialDate)
      .filter(Boolean)
      .map(date => date.getFullYear());
  return [...new Set([now.getFullYear(), ...years])].sort((a, b) => b - a);
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
    analyticsStore.fetchBuyerReport(iamStore.currentCompanyId, year, month));
const periodOrders = computed(() => ordersInPeriod(orders.value, selectedYear.value, selectedMonth.value));
const paidOrders = computed(() => periodOrders.value.filter(isPaidOrder));

// Per-equipment spending & consumption, aggregated from the buyer's orders.
const equipmentSpending = computed(() =>
  equipment.value.map(eq => {
    const related = paidOrders.value.filter(o => Number(o.equipmentId) === Number(eq.id));
    const spent = related.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
    const consumed = related.reduce((s, o) => s + Number(o.quantity || 0), 0);
    return {
      id: eq.id,
      name: eq.name,
      requiredFuelType: eq.requiredFuelType,
      unit: eq.unit,
      orders: related.length,
      consumed,
      spent,
    };
  }).sort((a, b) => b.spent - a.spent)
);

const totalSpent = computed(() => analyticsStore.buyerReport?.summary?.totalSpent ?? 0);
const paidSpent = totalSpent;
const totalOrders = computed(() => analyticsStore.buyerReport?.summary?.totalOrders ?? 0);
const avgOrder = computed(() => analyticsStore.buyerReport?.summary?.averageOrderValue ?? 0);

const PALETTE = ['#2563eb', '#059669', '#f59e0b', '#dc2626', '#6366f1', '#0ea5e9', '#a855f7', '#14b8a6'];

// Monthly spending
const monthlyChart = computed(() => {
  const points = analyticsStore.buyerReport?.trend ?? [];
  return {
    labels: points.map(point => point.month),
    datasets: [{ label: 'Spending', data: points.map(point => Number(point.amount)), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)', fill: true, tension: 0.35 }],
  };
});

// Spending by fuel type
const fuelChart = computed(() => {
  const points = analyticsStore.buyerReport?.byFuel ?? [];
  return {
    labels: points.map(point => fuelTypeLabel(point.fuelType)),
    datasets: [{ data: points.map(point => Number(point.amount)), backgroundColor: PALETTE }],
  };
});

// Spending by provider
const providerChart = computed(() => {
  const points = analyticsStore.buyerReport?.byProvider ?? [];
  return {
    labels: points.map(point => point.providerName),
    datasets: [{ data: points.map(point => Number(point.amount)), backgroundColor: PALETTE, borderRadius: 6 }],
  };
});

const barOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
const lineOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };

function money(v) { return `S/ ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`; }
</script>

<template>
  <div class="report-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('reporting.buyer.title') }}</h1>
        <p class="page-subtitle">{{ t('reporting.buyer.subtitle') }}</p>
      </div>
      <div class="period-filters">
        <pv-select v-model="selectedYear" :options="yearOptions" option-label="label" option-value="value" :placeholder="t('reporting.filters.year')"/>
        <pv-select v-model="selectedMonth" :options="monthOptions" option-label="label" option-value="value" :placeholder="t('reporting.filters.month')"/>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.buyer.kpi-spent') }}</span><span class="kpi-num">{{ money(totalSpent) }}</span></div>
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.buyer.kpi-paid') }}</span><span class="kpi-num">{{ money(paidSpent) }}</span></div>
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.buyer.kpi-orders') }}</span><span class="kpi-num">{{ totalOrders }}</span></div>
      <div class="kpi"><span class="kpi-lbl">{{ t('reporting.buyer.kpi-avg') }}</span><span class="kpi-num">{{ money(avgOrder) }}</span></div>
    </div>

    <div v-if="!periodOrders.length" class="report-empty">
      <i class="pi pi-chart-bar"/>
      <p class="re-title">{{ t('reporting.buyer.empty-title') }}</p>
      <p class="re-hint">{{ t('reporting.buyer.empty-hint') }}</p>
      <pv-button :label="t('reporting.buyer.empty-cta')" icon="pi pi-shopping-bag" @click="$router.push('/catalog')"/>
    </div>

    <template v-else>
    <div class="chart-grid">
      <pv-card class="chart-card wide">
        <template #content>
          <div class="chart-title">{{ t('reporting.buyer.monthly') }}</div>
          <div class="chart-box"><Chart type="line" :data="monthlyChart" :options="lineOptions" style="height:240px"/></div>
        </template>
      </pv-card>
      <pv-card class="chart-card">
        <template #content>
          <div class="chart-title">{{ t('reporting.buyer.by-fuel') }}</div>
          <div class="chart-box"><Chart type="doughnut" :data="fuelChart" :options="doughnutOptions" style="height:240px"/></div>
        </template>
      </pv-card>
    </div>

    <div class="chart-grid">
      <pv-card class="chart-card">
        <template #content>
          <div class="chart-title">{{ t('reporting.buyer.by-provider') }}</div>
          <div class="chart-box"><Chart type="bar" :data="providerChart" :options="barOptions" style="height:240px"/></div>
        </template>
      </pv-card>
      <pv-card class="chart-card wide">
        <template #content>
          <div class="chart-title">{{ t('reporting.buyer.equipment-consumption') }}</div>
          <pv-data-table :value="equipmentSpending" striped-rows class="mt">
            <pv-column :header="t('reporting.buyer.col-equipment')">
              <template #body="{ data }">{{ data.name }}</template>
            </pv-column>
            <pv-column :header="t('reporting.buyer.col-fuel')">
              <template #body="{ data }">{{ fuelTypeLabel(data.requiredFuelType) }}</template>
            </pv-column>
            <pv-column :header="t('reporting.buyer.col-orders')">
              <template #body="{ data }">{{ data.orders }}</template>
            </pv-column>
            <pv-column :header="t('reporting.buyer.col-consumed')">
              <template #body="{ data }">{{ Number(data.consumed).toLocaleString() }} {{ unitSuffix(data.unit) }}</template>
            </pv-column>
            <pv-column :header="t('reporting.buyer.col-spent')">
              <template #body="{ data }"><strong>{{ money(data.spent) }}</strong></template>
            </pv-column>
            <template #empty><div class="empty-row">{{ t('common.no-data') }}</div></template>
          </pv-data-table>
        </template>
      </pv-card>
    </div>
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
.report-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 4rem 2rem; text-align: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; color: #94a3b8; }
.report-empty i { font-size: 2.4rem; color: #cbd5e1; }
.re-title { font-weight: 700; color: #475569; margin: 6px 0 0; font-size: 1.05rem; }
.re-hint { margin: 0 0 8px; max-width: 420px; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.kpi-lbl { font-size: .76rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; }
.kpi-num { font-size: 1.6rem; font-weight: 700; color: #1a2744; }

.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-card.wide { grid-column: auto; }
.chart-title { font-size: 1rem; font-weight: 600; color: #1a2744; margin-bottom: 12px; }
.chart-box { height: 240px; }
.mt { margin-top: 6px; }
.mini-bar { display: inline-block; width: 80px; height: 7px; background: #e5e7eb; border-radius: 999px; overflow: hidden; vertical-align: middle; margin-right: 8px; }
.mini-fill { height: 100%; background: #2563eb; border-radius: 999px; }
.mini-pct { font-size: .8rem; color: #475569; }
.empty-row { text-align: center; color: #94a3b8; padding: 2rem; }

@media (max-width: 900px) { .chart-grid { grid-template-columns: 1fr; } }
</style>
