<script setup>
/**
 * Payment page (buyer). Route-level orchestrator: it loads pending orders and
 * payment history, and on a `pay` event from the dialog it calls the shared
 * coordination service (which records the payment + invoice and flips the order
 * payment status). The page never mutates the Ordering store directly.
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import useOrderingStore from '../../../ordering/application/ordering.store.js';
import usePaymentStore from '../../application/payment.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { completePayment } from '../../../shared/application/coordination.service.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import PaymentDialog from '../components/payment-dialog.vue';
import InvoiceDocument from '../components/invoice-document.vue';
import pinia from '../../../pinia.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const orderingStore = useOrderingStore(pinia);
const paymentStore = usePaymentStore(pinia);
const iamStore = useIamStore(pinia);

const tab = ref('pending');
const dialogVisible = ref(false);
const selectedOrder = ref(null);
const invoiceVisible = ref(false);
const selectedInvoice = ref(null);
const successVisible = ref(false);
const processing = ref(false);

onMounted(async () => {
  if (!iamStore.buyerCompanies.length) await iamStore.fetchDirectories();
  if (!orderingStore.ordersLoaded) await orderingStore.fetchOrders();
  await Promise.all([paymentStore.fetchPayments(), paymentStore.fetchInvoices()]);

  // Deep-link from notifications.
  // "Payment registered" → open the history tab (the new payment shows there).
  if (route.query.tab === 'history') tab.value = 'history';

  // "Invoice generated" → open the viewer for that order's invoice directly.
  const orderId = Number(route.query.invoice);
  if (orderId) {
    const invoice = buyerInvoices.value.find(i => Number(i.orderId) === orderId);
    if (invoice) {
      tab.value = 'history';
      viewInvoice(invoice);
    }
  }
});

const companyId = computed(() => iamStore.currentCompanyId);

// Only orders the buyer has received (confirmed reception) are payable.
const pendingOrders = computed(() =>
  orderingStore.ordersForBuyer(companyId.value)
    .filter(o => o.status === 'PENDING_PAYMENT' && !paymentStore.isOrderPaid(o.id))
);
const buyerPayments = computed(() => paymentStore.paymentsForBuyer(companyId.value));
const buyerInvoices = computed(() => paymentStore.invoicesForBuyer(companyId.value));

function money(value) {
  return `S/ ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}
const statusSeverity = orderStatusSeverity;

function openPay(order) {
  selectedOrder.value = order;
  dialogVisible.value = true;
}

async function onPay(payload) {
  if (!selectedOrder.value) return;
  processing.value = true;
  const order = selectedOrder.value;
  const buyer = iamStore.buyerCompanies.find(c => c.id === (order.companyId ?? order.clientId));
  const provider = iamStore.providerCompanies.find(p => p.id === order.providerId);

  const result = await completePayment({ order, method: payload.method, card: payload.card, buyer, provider });
  processing.value = false;
  dialogVisible.value = false;

  if (result?.invoice) {
    selectedInvoice.value = result.invoice;
    tab.value = 'history';
    // Strong post-payment closure: confirm the cycle is complete before showing
    // the invoice, with clear next steps.
    successVisible.value = true;
  }
}

function viewPaidInvoice() {
  successVisible.value = false;
  invoiceVisible.value = true;
}
function backToOrders() {
  successVisible.value = false;
  router.push('/ordering/my-orders');
}

function viewInvoice(invoice) {
  selectedInvoice.value = invoice;
  invoiceVisible.value = true;
}
function invoiceForPayment(payment) {
  return buyerInvoices.value.find(i => i.paymentId === payment.id);
}

// Browser print (save as PDF) of the open invoice — fully client-side.
function printInvoice() {
  window.print();
}

// Client-side CSV export of the payment history with clear simulation disclosure.
function exportHistory() {
  const disclaimer = '# SIMULATED PAYMENT HISTORY - ACADEMIC DEMO ONLY - NOT A TAX OR FISCAL DOCUMENT';
  const headers = ['Payment', 'Order', 'Method', 'Amount', 'Status', 'Date', 'Type'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = buyerPayments.value.map(p => [
    p.reference || `PAY-${String(p.id).padStart(4, '0')}`,
    `FT-${String(p.orderId).padStart(3, '0')}`,
    p.method,
    Number(p.amount || 0).toFixed(2),
    p.status,
    formatDate(p.createdAt),
    'SIMULATED_DEMO',
  ].map(escape).join(','));
  const csv = [disclaimer, headers.map(escape).join(','), ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simulated-payment-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="pay-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('payment.title') }}</h1>
        <p class="page-subtitle">{{ t('payment.subtitle') }}</p>
      </div>
      <pv-tag :value="t('payment.simulated-badge')" severity="warn" class="header-badge"/>
    </div>

    <pv-message severity="info" :closable="false" class="simulation-banner">
      {{ t('payment.simulated-warning') }}
    </pv-message>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'pending' }" @click="tab = 'pending'">
        {{ t('payment.tab-pending') }} <span class="badge">{{ pendingOrders.length }}</span>
      </button>
      <button class="tab" :class="{ active: tab === 'history' }" @click="tab = 'history'">{{ t('payment.tab-history') }}</button>
    </div>

    <!-- Pending payments -->
    <div v-if="tab === 'pending'">
      <div v-if="pendingOrders.length === 0" class="empty-state">
        <i class="pi pi-check-circle"/>
        <p>{{ t('payment.no-pending') }}</p>
      </div>
      <div v-else class="card-grid">
        <pv-card v-for="order in pendingOrders" :key="order.id" class="pay-card">
          <template #content>
            <div class="pc-head">
              <span class="pc-id">#FT-{{ String(order.id).padStart(3, '0') }}</span>
              <pv-tag :value="t('ordering.status-' + order.status)" :severity="statusSeverity(order.status)"/>
            </div>
            <div class="pc-fuel">{{ fuelTypeLabel(order.fuelType) }}</div>
            <div class="pc-meta">{{ order.quantity }} {{ order.unit === 'LITERS' ? 'L' : 'gal' }} · {{ order.deliveryAddress?.split(',')[0] }}</div>
            <div class="pc-total">{{ money(order.totalAmount) }}</div>
            <pv-button :label="t('payment.pay-now')" icon="pi pi-credit-card" class="pc-btn" @click="openPay(order)"/>
          </template>
        </pv-card>
      </div>
    </div>

    <!-- Payment history -->
    <div v-else-if="tab === 'history'">
      <div class="history-toolbar">
        <pv-button :label="t('payment.export-history')" icon="pi pi-download" outlined size="small" :disabled="!buyerPayments.length" @click="exportHistory"/>
      </div>
      <pv-data-table :value="buyerPayments" striped-rows class="data">
        <pv-column field="id" :header="t('payment.col-payment')">
          <template #body="{ data }"><span class="mono">#PAY-{{ String(data.id).padStart(4, '0') }}</span></template>
        </pv-column>
        <pv-column field="orderId" :header="t('payment.order-ref')">
          <template #body="{ data }">#FT-{{ String(data.orderId).padStart(3, '0') }}</template>
        </pv-column>
        <pv-column field="method" :header="t('payment.method')">
          <template #body="{ data }"><pv-tag :value="data.method" severity="info"/></template>
        </pv-column>
        <pv-column field="amount" :header="t('payment.amount')">
          <template #body="{ data }">{{ money(data.amount) }}</template>
        </pv-column>
        <pv-column field="createdAt" :header="t('payment.date')">
          <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
        </pv-column>
        <pv-column field="status" :header="t('common.status')">
          <template #body="{ data }"><pv-tag :value="data.status" severity="success"/></template>
        </pv-column>
        <pv-column :header="t('common.actions')">
          <template #body="{ data }">
            <pv-button
                v-if="invoiceForPayment(data)"
                icon="pi pi-file" text rounded
                @click="viewInvoice(invoiceForPayment(data))"
            />
          </template>
        </pv-column>
        <template #empty><div class="empty-row">{{ t('payment.no-payments') }}</div></template>
      </pv-data-table>
    </div>

    <!-- Payment dialog (child emits `pay`) -->
    <PaymentDialog v-model:visible="dialogVisible" :order="selectedOrder" @pay="onPay"/>

    <!-- Post-payment success closure -->
    <pv-dialog v-model:visible="successVisible" modal :closable="false" :style="{ width: '420px' }">
      <div class="success-box">
        <div class="success-ring"><i class="pi pi-check"/></div>
        <h2 class="success-title">{{ t('payment.success-title') }}</h2>
        <ul class="success-list">
          <li><i class="pi pi-check-circle"/> {{ t('payment.success-paid') }}</li>
          <li><i class="pi pi-check-circle"/> {{ t('payment.success-invoice') }}</li>
          <li><i class="pi pi-check-circle"/> {{ t('payment.success-order') }}</li>
        </ul>
      </div>
      <template #footer>
        <pv-button :label="t('payment.back-to-orders')" icon="pi pi-arrow-left" text @click="backToOrders"/>
        <pv-button :label="t('payment.view-invoice')" icon="pi pi-file" @click="viewPaidInvoice"/>
      </template>
    </pv-dialog>

    <!-- Invoice viewer -->
    <pv-dialog v-model:visible="invoiceVisible" modal :header="t('payment.invoice')" :style="{ width: '620px' }">
      <InvoiceDocument v-if="selectedInvoice" :invoice="selectedInvoice"/>
      <template #footer>
        <pv-button :label="t('common.close')" text @click="invoiceVisible = false"/>
        <pv-button :label="t('payment.print-invoice')" icon="pi pi-print" @click="printInvoice"/>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.pay-page { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }
.header-badge { font-weight: 700; letter-spacing: 0.5px; }
.simulation-banner { margin-top: -6px; }

.tabs { display: flex; gap: 8px; border-bottom: 2px solid #eef2f7; }
.tab { border: none; background: transparent; padding: 10px 18px; cursor: pointer; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -2px; display: flex; align-items: center; gap: 8px; }
.tab.active { color: #1e3a8a; border-bottom-color: #2563eb; }
.badge { background: #e0e7ff; color: #1e3a8a; border-radius: 999px; padding: 1px 8px; font-size: .75rem; }

.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.pay-card { border-radius: 14px; }
.pc-head { display: flex; justify-content: space-between; align-items: center; }
.pc-id { font-weight: 700; color: #1e3a8a; font-family: monospace; }
.pc-fuel { font-size: 1.1rem; font-weight: 700; color: #1a2744; margin-top: 10px; }
.pc-meta { font-size: .85rem; color: #64748b; margin-top: 2px; }
.pc-total { font-size: 1.5rem; font-weight: 700; color: #1a2744; margin: 14px 0; }
.pc-btn { width: 100%; justify-content: center; }

.history-toolbar { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.data { border-radius: 12px; overflow: hidden; }
.mono { font-family: monospace; font-weight: 600; color: #1e3a8a; }
.empty-row { text-align: center; padding: 24px; color: #94a3b8; }

.invoice-grid { display: flex; flex-direction: column; gap: 10px; }
.inv-row { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 18px; cursor: pointer; transition: box-shadow .15s; }
.inv-row:hover { box-shadow: 0 4px 14px rgba(0,0,0,.06); }
.inv-left { display: flex; align-items: center; gap: 14px; }
.inv-left i { font-size: 1.4rem; color: #6366f1; }
.inv-number { font-weight: 700; color: #1a2744; }
.inv-sub { font-size: .82rem; color: #64748b; }
.inv-right { display: flex; align-items: center; gap: 12px; }
.inv-total { font-weight: 700; color: #1a2744; }

.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: .75rem; }

.success-box { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 8px 4px 0; }
.success-ring { width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; color: #059669; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin-bottom: 14px; }
.success-title { font-size: 1.3rem; font-weight: 700; color: #1a2744; margin: 0 0 16px; }
.success-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; align-self: stretch; }
.success-list li { display: flex; align-items: center; gap: 10px; color: #1a2744; font-weight: 500; background: #f8fafc; border-radius: 8px; padding: 10px 14px; }
.success-list i { color: #059669; }
</style>
