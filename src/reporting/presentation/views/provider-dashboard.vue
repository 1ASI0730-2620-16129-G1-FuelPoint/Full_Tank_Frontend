<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Chart from 'primevue/chart';
import useOrderingStore from '../../../ordering/application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import useAnalyticsStore from '../../application/analytics.store.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import { money } from '../../../shared/domain/helpers.js';
import pinia from '../../../pinia.js';

const router = useRouter();
const { t, locale } = useI18n();
const orderingStore = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);
const analyticsStore = useAnalyticsStore(pinia);

onMounted(async () => {
  if (!orderingStore.ordersLoaded) orderingStore.fetchOrders();
  if (!orderingStore.requestsLoaded) orderingStore.fetchRequests();
  await analyticsStore.fetchProviderDashboard(iamStore.currentProviderId);
});

const providerId = computed(() => iamStore.currentProviderId);
const providerOrders = computed(() => orderingStore.ordersForProvider(providerId.value));
const activeProviderOrders = computed(() =>
  providerOrders.value.filter(o => ['ACCEPTED', 'DISPATCHED', 'PENDING_PAYMENT'].includes(o.status))
);
const pendingProviderRequests = computed(() =>
  orderingStore.requestsForProvider(providerId.value).filter(r => r.status === 'PENDING')
);

// ── Collections (money to collect) ───────────────────────────────────────────
const receivableOrders = computed(() => providerOrders.value.filter(o => o.status === 'PENDING_PAYMENT'));
const totalReceivable = computed(() => receivableOrders.value.reduce((s, o) => s + Number(o.totalAmount || 0), 0));
const goToCollections = () => router.push('/ordering/collections');

// ── Fuel KPI ───────────────────────────────────────────────────────────────
const LITERS_PER_GALLON = 3.78541;
const fuelUnit = ref('LITERS');

const totalFuelLiters = computed(() =>
  Number(analyticsStore.providerDashboard?.fuelInActiveOrders ?? 0)
);

const totalFuelGallons = computed(() => totalFuelLiters.value / LITERS_PER_GALLON);

const totalFuelDisplay = computed(() =>
  fuelUnit.value === 'GALLONS'
    ? Math.round(totalFuelGallons.value).toLocaleString('en-US')
    : Math.round(totalFuelLiters.value).toLocaleString('en-US')
);

// ── Trend Chart ────────────────────────────────────────────────────────────
const currentPeriod = new Date();
const currentPeriodLabel = computed(() =>
    currentPeriod.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
);
const series = computed(() => {
  const points = analyticsStore.providerDashboard?.salesTrend ?? [];
  return { labels: points.map(point => point.label), values: points.map(point => Number(point.amount)) };
});
const hasChartData = computed(() => series.value.values.some(v => v > 0));

const chartData = computed(() => {
  const d = series.value;
  const last = d.values.length - 1;
  return {
    labels: d.labels,
    datasets: [{
      data: d.values,
      backgroundColor: d.values.map((_, i) => i === last ? '#1a2e6b' : '#adc4e8'),
      borderRadius: 6,
      borderSkipped: false,
      barPercentage: 0.55,
    }],
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#8b9ab5', font: { size: 11 } } },
    y: { display: false, beginAtZero: true },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function formatVolume(quantity, unit) {
  return `${Number(quantity).toLocaleString('en-US')} ${unit === 'LITERS' ? 'L' : 'gal'}`;
}

function formatEta(order) {
  if (order.status === 'PAID' || order.status === 'CLOSED') return t('dashboard.eta-completed');
  if (order.status === 'DISPATCHED') return t('dashboard.eta-in-transit');
  const val = order.estimatedDeliveryDate ?? order.createdAt;
  if (!val) return '—';
  // Parse date-only strings ("YYYY-MM-DD") as local to avoid timezone drift.
  let d;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, day] = val.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(val);
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const goToOrders   = () => router.push('/ordering/orders');
const goToPending  = () => router.push('/ordering/pending');
const goToReports  = () => router.push('/reporting/provider');
const viewOrder    = (order) => router.push(`/ordering/orders/${order.id}`);
</script>

<template>
  <div class="dashboard-container">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('dashboard.provider-title') }}</h1>
        <p class="page-subtitle">{{ iamStore.displayName }} · {{ t('dashboard.provider-subtitle') }}</p>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-row">
      <pv-card class="kpi-card">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon fuel"><i class="pi pi-bolt"/></div>
            <div class="kpi-info">
              <span class="kpi-label">{{ t('dashboard.kpi-fuel-active') }}</span>
              <span class="kpi-value">
                {{ totalFuelDisplay }}
                <span class="kpi-unit">{{ fuelUnit === 'LITERS' ? 'L' : 'gal' }}</span>
              </span>
              <div class="unit-toggle">
                <button class="unit-btn" :class="{ active: fuelUnit === 'LITERS' }" @click="fuelUnit = 'LITERS'">L</button>
                <button class="unit-btn" :class="{ active: fuelUnit === 'GALLONS' }" @click="fuelUnit = 'GALLONS'">gal</button>
              </div>
            </div>
          </div>
        </template>
      </pv-card>

      <pv-card class="kpi-card" style="cursor:pointer" @click="goToOrders">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon orders"><i class="pi pi-truck"/></div>
            <div class="kpi-info">
              <span class="kpi-label">{{ t('dashboard.kpi-active-orders') }}</span>
              <span class="kpi-value">{{ analyticsStore.providerDashboard?.activeOrders ?? 0 }}</span>
            </div>
          </div>
        </template>
      </pv-card>

      <pv-card class="kpi-card" style="cursor:pointer" @click="goToPending">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon pending"><i class="pi pi-inbox"/></div>
            <div class="kpi-info">
              <span class="kpi-label">{{ t('dashboard.kpi-pending-requests') }}</span>
              <span class="kpi-value">{{ analyticsStore.providerDashboard?.pendingRequests ?? 0 }}</span>
            </div>
          </div>
        </template>
      </pv-card>

      <pv-card class="kpi-card" style="cursor:pointer" @click="goToCollections">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon receivable"><i class="pi pi-wallet"/></div>
            <div class="kpi-info">
              <span class="kpi-label">{{ t('dashboard.kpi-receivable') }}</span>
              <span class="kpi-value">{{ money(analyticsStore.providerDashboard?.toCollect ?? 0) }}</span>
              <span class="kpi-sub">{{ receivableOrders.length }} {{ t('dashboard.kpi-receivable-count') }} <i class="pi pi-arrow-right"/></span>
            </div>
          </div>
        </template>
      </pv-card>
    </div>

    <!-- Selling Trend Chart -->
    <pv-card class="chart-card" style="cursor:pointer" @click="goToReports">
      <template #content>
        <div class="chart-header">
          <div>
            <div class="chart-title">{{ t('dashboard.selling-trend') }}</div>
            <div class="chart-subtitle">{{ t('dashboard.selling-subtitle', { month: currentPeriodLabel }) }}</div>
          </div>
        </div>
        <div class="chart-area">
          <Chart v-if="hasChartData" type="bar" :data="chartData" :options="chartOptions" style="height:220px"/>
          <div v-else class="chart-empty">
            <i class="pi pi-chart-bar"/>
            <span>{{ t('dashboard.chart-empty') }}</span>
          </div>
        </div>
      </template>
    </pv-card>

    <!-- Active Orders Table -->
    <pv-card class="orders-card">
      <template #content>
        <div class="orders-header">
          <div>
            <div class="orders-title">{{ t('dashboard.active-orders') }}</div>
            <div class="orders-subtitle">{{ t('dashboard.active-orders-subtitle') }}</div>
          </div>
          <pv-button :label="t('dashboard.view-all-orders')" icon="pi pi-arrow-right" icon-pos="right" outlined class="view-all-btn" @click="goToOrders"/>
        </div>

        <pv-data-table :value="activeProviderOrders" :loading="orderingStore.loading" striped-rows class="orders-table">
          <pv-column field="id" :header="t('dashboard.col-order-id')">
            <template #body="{ data }">
              <span class="order-id">#FT-{{ String(data.id).padStart(3, '0') }}</span>
            </template>
          </pv-column>
          <pv-column field="deliveryAddress" :header="t('dashboard.col-destination')">
            <template #body="{ data }">
              <span class="destination-main">{{ data.deliveryAddress?.split(',')[0] }}</span>
              <span class="destination-sub">{{ data.deliveryAddress?.split(',').slice(1).join(',').trim() }}</span>
            </template>
          </pv-column>
          <pv-column field="quantity" :header="t('dashboard.col-volume')">
            <template #body="{ data }"><span class="volume-text">{{ formatVolume(data.quantity, data.unit) }}</span></template>
          </pv-column>
          <pv-column field="status" :header="t('dashboard.col-eta')">
            <template #body="{ data }"><span class="eta-text">{{ formatEta(data) }}</span></template>
          </pv-column>
          <pv-column field="status" :header="t('common.status')">
            <template #body="{ data }"><pv-tag :value="t('ordering.status-' + data.status)" :severity="orderStatusSeverity(data.status)"/></template>
          </pv-column>
          <pv-column header="">
            <template #body="{ data }">
              <pv-button icon="pi pi-eye" text rounded severity="secondary" @click="viewOrder(data)"/>
            </template>
          </pv-column>
          <template #empty><div class="no-data">{{ t('dashboard.no-active-orders') }}</div></template>
        </pv-data-table>
      </template>
    </pv-card>

  </div>
</template>

<style scoped>
.dashboard-container { display: flex; flex-direction: column; gap: 20px; background: #f4f6fb; min-height: 100%; }
.page-title    { font-size: 28px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }

.kpi-row { display: flex; gap: 16px; flex-wrap: wrap; }
.kpi-card { flex: 0 0 auto; min-width: 240px; }
.kpi-inner { display: flex; align-items: flex-start; gap: 16px; padding: 4px 0; }
.kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px; }
.kpi-icon.fuel   { background: #e8f0fd; color: #2563eb; }
.kpi-icon.orders { background: #e6f7f1; color: #059669; }
.kpi-icon.pending { background: #fef3c7; color: #d97706; }
.kpi-icon.receivable { background: #ede9fe; color: #7c3aed; }
.kpi-info  { display: flex; flex-direction: column; }
.kpi-label { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; color: #8b9ab5; text-transform: uppercase; }
.kpi-value { font-size: 30px; font-weight: 700; color: #1a2744; line-height: 1.1; margin-top: 4px; }
.kpi-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; display: flex; align-items: center; gap: 4px; }
.kpi-sub i { font-size: 10px; }
.chart-empty { height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: #94a3b8; }
.chart-empty i { font-size: 2rem; }
.kpi-unit  { font-size: 14px; font-weight: 400; color: #8b9ab5; margin-left: 4px; }

.unit-toggle { display: flex; gap: 4px; margin-top: 8px; }
.unit-btn { padding: 2px 10px; border-radius: 999px; border: 1px solid #d1d5db; font-size: 12px; font-weight: 600; cursor: pointer; background: #fff; color: #6b7280; transition: all 0.15s; }
.unit-btn.active { background: #1a2e6b; color: #fff; border-color: #1a2e6b; }
.unit-btn:hover:not(.active) { background: #f3f4f6; }

.chart-card { transition: box-shadow 0.2s; }
.chart-card:hover { box-shadow: 0 4px 16px rgba(37,99,235,0.12); }
.chart-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.chart-title    { font-size: 18px; font-weight: 600; color: #1a2744; }
.chart-subtitle { font-size: 13px; color: #8b9ab5; margin-top: 2px; }
.chart-area     { height: 220px; }

.orders-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.orders-title    { font-size: 18px; font-weight: 600; color: #1a2744; }
.orders-subtitle { font-size: 13px; color: #8b9ab5; margin-top: 2px; }
.view-all-btn    { font-size: 13px; }

.order-id         { font-weight: 700; color: #1a2e6b; font-size: 14px; font-family: 'Courier New', monospace; }
.destination-main { display: block; font-weight: 600; color: #1a2744; font-size: 14px; }
.destination-sub  { display: block; font-size: 11px; color: #8b9ab5; margin-top: 1px; }
.volume-text      { font-weight: 600; color: #1a2744; }
.eta-text         { font-size: 13px; color: #4a5568; }
.no-data          { text-align: center; padding: 32px; color: #8b9ab5; }
</style>
