<script setup>
/**
 * Buyer dashboard (home for the buyer/applicant segment). Aggregates read data
 * from Ordering and Equipment for KPIs, a spending trend and quick alerts.
 */
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Chart from 'primevue/chart';
import useOrderingStore from '../../../ordering/application/ordering.store.js';
import useEquipmentStore from '../../../equipment/application/equipment.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import useAnalyticsStore from '../../application/analytics.store.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import pinia from '../../../pinia.js';

const router = useRouter();
const { t, locale } = useI18n();
const orderingStore = useOrderingStore(pinia);
const equipmentStore = useEquipmentStore(pinia);
const iamStore = useIamStore(pinia);
const analyticsStore = useAnalyticsStore(pinia);

onMounted(async () => {
  if (!orderingStore.ordersLoaded) orderingStore.fetchOrders();
  if (!equipmentStore.loaded) equipmentStore.fetchEquipment();
  await analyticsStore.fetchBuyerDashboard(iamStore.currentCompanyId);
});

const companyId = computed(() => iamStore.currentCompanyId);
const orders = computed(() => orderingStore.ordersForBuyer(companyId.value));
const equipment = computed(() => equipmentStore.forCompany(companyId.value));

const activeOrders = computed(() => analyticsStore.buyerDashboard?.activeOrders ?? 0);
const pendingPayments = computed(() => analyticsStore.buyerDashboard?.pendingPayments ?? 0);
const refillNeeded = computed(() => equipment.value.filter(e => e.needsRefill()));
const totalSpent = computed(() => analyticsStore.buyerDashboard?.totalSpent ?? 0);

const currentPeriod = new Date();
const currentPeriodLabel = computed(() =>
    currentPeriod.toLocaleDateString(locale.value, { month: 'long', year: 'numeric' })
);
const spendingChart = computed(() => {
  const points = analyticsStore.buyerDashboard?.spendingTrend ?? [];
  const labels = points.map(point => point.label);
  const values = points.map(point => Number(point.amount));
  return {
    labels,
    datasets: [{
      data: values,
      backgroundColor: values.map(value => value > 0 ? '#1a2e6b' : '#dbe5f4'),
      borderRadius: 6, borderSkipped: false, barPercentage: 0.55,
    }],
  };
});
const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false }, ticks: { color: '#8b9ab5', font: { size: 11 } } }, y: { display: false, beginAtZero: true } },
};

const recentOrders = computed(() =>
  [...orders.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
);

function money(v) { return `S/ ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`; }
function goRequestFuel() { router.push('/catalog'); }
function goRefillCritical() { router.push('/equipment'); }
</script>

<template>
  <div class="dashboard-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('dashboard.buyer-title') }}</h1>
        <p class="page-subtitle">{{ iamStore.displayName }} · {{ t('dashboard.buyer-subtitle') }}</p>
      </div>
      <div class="header-cta">
        <pv-button
            v-if="refillNeeded.length"
            :label="t('dashboard.cta-refill-critical', { n: refillNeeded.length }, refillNeeded.length)"
            icon="pi pi-bolt"
            severity="warn"
            outlined
            @click="goRefillCritical"
        />
        <pv-button
            :label="t('dashboard.cta-request')"
            icon="pi pi-plus"
            @click="goRequestFuel"
        />
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-row">
      <pv-card class="kpi-card" style="cursor:pointer" @click="router.push('/ordering/my-orders')">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon orders"><i class="pi pi-shopping-cart"/></div>
            <div class="kpi-info"><span class="kpi-label">{{ t('dashboard.kpi-active-orders') }}</span><span class="kpi-value">{{ activeOrders }}</span></div>
          </div>
        </template>
      </pv-card>

      <pv-card class="kpi-card" style="cursor:pointer" @click="router.push('/payment')">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon pay"><i class="pi pi-credit-card"/></div>
            <div class="kpi-info"><span class="kpi-label">{{ t('dashboard.kpi-pending-pay') }}</span><span class="kpi-value">{{ pendingPayments }}</span></div>
          </div>
        </template>
      </pv-card>

      <pv-card class="kpi-card" style="cursor:pointer" @click="router.push('/equipment')">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon refill"><i class="pi pi-bolt"/></div>
            <div class="kpi-info"><span class="kpi-label">{{ t('dashboard.kpi-refill') }}</span><span class="kpi-value">{{ analyticsStore.buyerDashboard?.needsRefill ?? 0 }}</span></div>
          </div>
        </template>
      </pv-card>

      <pv-card class="kpi-card">
        <template #content>
          <div class="kpi-inner">
            <div class="kpi-icon spent"><i class="pi pi-wallet"/></div>
            <div class="kpi-info"><span class="kpi-label">{{ t('dashboard.kpi-spent') }}</span><span class="kpi-value small">{{ money(totalSpent) }}</span></div>
          </div>
        </template>
      </pv-card>
    </div>

    <div class="two-col">
      <!-- Spending chart -->
      <pv-card class="chart-card">
        <template #content>
          <div class="chart-title">{{ t('dashboard.spending-trend') }}</div>
          <div class="chart-subtitle">{{ t('dashboard.spending-subtitle', { month: currentPeriodLabel }) }}</div>
          <div class="chart-area"><Chart type="bar" :data="spendingChart" :options="chartOptions" style="height:220px"/></div>
        </template>
      </pv-card>

      <!-- Equipment alerts -->
      <pv-card class="alerts-card">
        <template #content>
          <div class="chart-title">{{ t('dashboard.equipment-alerts') }}</div>
          <div v-if="refillNeeded.length === 0" class="no-alerts"><i class="pi pi-check-circle"/> {{ t('dashboard.no-alerts') }}</div>
          <div v-else class="alert-list">
            <div v-for="e in refillNeeded.slice(0, 4)" :key="e.id" class="alert-item" @click="router.push('/equipment')">
              <div class="alert-icon"><i class="pi pi-exclamation-triangle"/></div>
              <div class="alert-body">
                <div class="alert-name">{{ e.name }}</div>
                <div class="alert-sub">{{ fuelTypeLabel(e.requiredFuelType) }} · {{ e.fillPercentage() }}%</div>
              </div>
              <pv-button icon="pi pi-arrow-right" text rounded size="small"/>
            </div>
          </div>
        </template>
      </pv-card>
    </div>

    <!-- Recent orders -->
    <pv-card class="orders-card">
      <template #content>
        <div class="orders-header">
          <div>
            <div class="orders-title">{{ t('dashboard.recent-orders') }}</div>
            <div class="orders-subtitle">{{ t('dashboard.recent-subtitle') }}</div>
          </div>
          <pv-button :label="t('dashboard.view-all')" icon="pi pi-arrow-right" icon-pos="right" outlined @click="router.push('/ordering/my-orders')"/>
        </div>
        <pv-data-table :value="recentOrders" :loading="orderingStore.loading" striped-rows>
          <pv-column field="id" header="Order ID">
            <template #body="{ data }"><span class="order-id">#FT-{{ String(data.id).padStart(3, '0') }}</span></template>
          </pv-column>
          <pv-column field="fuelType" :header="t('dashboard.col-fuel')">
            <template #body="{ data }">{{ fuelTypeLabel(data.fuelType) }}</template>
          </pv-column>
          <pv-column field="quantity" :header="t('dashboard.col-volume')">
            <template #body="{ data }">{{ data.quantity }} {{ data.unit === 'LITERS' ? 'L' : 'gal' }}</template>
          </pv-column>
          <pv-column field="totalAmount" :header="t('dashboard.col-total')">
            <template #body="{ data }">{{ money(data.totalAmount) }}</template>
          </pv-column>
          <pv-column field="status" :header="t('common.status')">
            <template #body="{ data }"><pv-tag :value="t('ordering.status-' + data.status)" :severity="orderStatusSeverity(data.status)"/></template>
          </pv-column>
          <template #empty><div class="no-data">{{ t('dashboard.no-orders') }}</div></template>
        </pv-data-table>
      </template>
    </pv-card>
  </div>
</template>

<style scoped>
.dashboard-container { display: flex; flex-direction: column; gap: 20px; min-height: 100%; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { font-size: 28px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }
.header-cta { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
.kpi-inner { display: flex; align-items: flex-start; gap: 16px; padding: 4px 0; }
.kpi-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px; }
.kpi-icon.orders { background: #e8f0fd; color: #2563eb; }
.kpi-icon.pay { background: #ede9fe; color: #7c3aed; }
.kpi-icon.refill { background: #fef3c7; color: #d97706; }
.kpi-icon.spent { background: #e6f7f1; color: #059669; }
.kpi-info { display: flex; flex-direction: column; }
.kpi-label { font-size: 11px; font-weight: 600; letter-spacing: 0.6px; color: #8b9ab5; text-transform: uppercase; }
.kpi-value { font-size: 30px; font-weight: 700; color: #1a2744; line-height: 1.1; margin-top: 4px; }
.kpi-value.small { font-size: 22px; }

.two-col { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.chart-title { font-size: 18px; font-weight: 600; color: #1a2744; }
.chart-subtitle { font-size: 13px; color: #8b9ab5; margin: 2px 0 12px; }
.chart-area { height: 220px; }

.no-alerts { color: #059669; display: flex; align-items: center; gap: 8px; padding: 20px 0; }
.alert-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.alert-item { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; cursor: pointer; transition: background .15s; }
.alert-item:hover { background: #f8fafc; }
.alert-icon { width: 36px; height: 36px; border-radius: 9px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; }
.alert-body { flex: 1; }
.alert-name { font-weight: 600; color: #1a2744; font-size: .9rem; }
.alert-sub { font-size: .78rem; color: #94a3b8; }

.orders-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.orders-title { font-size: 18px; font-weight: 600; color: #1a2744; }
.orders-subtitle { font-size: 13px; color: #8b9ab5; margin-top: 2px; }
.order-id { font-weight: 700; color: #1a2e6b; font-family: 'Courier New', monospace; }
.no-data { text-align: center; padding: 32px; color: #8b9ab5; }

@media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }
</style>
