<script setup>
/**
 * Buyer "My Orders" page. Route-level coordinator: the buyer confirms reception
 * of a dispatched order (which tops up the equipment and moves the order to
 * pending payment) and navigates to Payment for orders awaiting payment.
 * Reception is handled through the shared coordination service.
 */
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import useOrderingStore from '../../application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { confirmOrderReception } from '../../../shared/application/coordination.service.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { orderStatusSeverity } from '../../../shared/domain/order-status.js';
import { money, unitSuffix } from '../../../shared/domain/helpers.js';
import pinia from '../../../pinia.js';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const store = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);

onMounted(() => {
  if (!store.ordersLoaded) store.fetchOrders();
  if (!iamStore.providerCompanies.length) iamStore.fetchDirectories();
});

const orders = computed(() =>
  [...store.ordersForBuyer(iamStore.currentCompanyId)]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
);

function providerName(id) {
  return iamStore.providerCompanies.find(p => p.id === id)?.name ?? `Provider #${id}`;
}

function confirmReception(order) {
  confirm.require({
    message: t('ordering.confirm-reception-msg', { id: order.id }),
    header: t('ordering.confirm-reception'),
    icon: 'pi pi-check-circle',
    acceptClass: 'p-button-success',
    accept: async () => {
      await confirmOrderReception({ order });
      toast.add({ severity: 'success', summary: t('ordering.reception-done'), detail: t('ordering.reception-done-detail'), life: 4000 });
    },
  });
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('ordering.my-orders-title') }}</h1>
        <p class="page-subtitle">{{ t('ordering.my-orders-subtitle') }}</p>
      </div>
      <pv-button icon="pi pi-refresh" text rounded :loading="store.loading" @click="store.fetchOrders()"/>
    </div>

    <div v-if="orders.length === 0 && !store.loading" class="empty-state">
      <i class="pi pi-shopping-cart"/>
      <p>{{ t('ordering.no-orders') }}</p>
    </div>

    <div v-else class="order-cards">
      <div v-for="order in orders" :key="order.id" class="order-card" @click="router.push(`/ordering/my-orders/${order.id}`)">
        <div class="oc-main">
          <div class="oc-id-col">
            <span class="oc-id">#FT-{{ String(order.id).padStart(3, '0') }}</span>
            <pv-tag :value="t('ordering.status-' + order.status)" :severity="orderStatusSeverity(order.status)"/>
          </div>
          <div class="oc-info">
            <div class="oc-fuel">{{ fuelTypeLabel(order.fuelType) }}</div>
            <div class="oc-sub">{{ providerName(order.providerId) }}</div>
          </div>
          <div class="oc-field">
            <span class="oc-label">{{ t('ordering.col-quantity') }}</span>
            <span class="oc-value">{{ order.quantity }} {{ unitSuffix(order.unit) }}</span>
          </div>
          <div class="oc-field">
            <span class="oc-label">{{ t('ordering.col-total') }}</span>
            <span class="oc-value strong">{{ money(order.totalAmount) }}</span>
          </div>
          <div class="oc-field">
            <span class="oc-label">{{ t('ordering.col-payment-status') }}</span>
            <pv-tag
                :value="order.paymentStatus === 'PAID' || order.status === 'PAID' ? t('ordering.payment-paid') : t('ordering.payment-pending')"
                :severity="order.paymentStatus === 'PAID' || order.status === 'PAID' ? 'success' : 'warn'"
            />
          </div>
        </div>
        <div class="oc-actions" @click.stop>
          <pv-button
              v-if="order.status === 'DISPATCHED'"
              :label="t('ordering.confirm-reception')"
              icon="pi pi-check"
              size="small"
              severity="success"
              @click="confirmReception(order)"
          />
          <pv-button
              v-else-if="order.status === 'PENDING_PAYMENT'"
              :label="t('ordering.pay')"
              icon="pi pi-credit-card"
              size="small"
              @click="router.push('/payment')"
          />
          <span v-else-if="order.status === 'ACCEPTED'" class="oc-hint">{{ t('ordering.awaiting-dispatch') }}</span>
          <span v-else class="oc-hint done"><i class="pi pi-check-circle"/> {{ t('ordering.completed') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }

.order-cards { display: flex; flex-direction: column; gap: 12px; }
.order-card {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 22px;
  transition: box-shadow .15s; cursor: pointer;
}
.order-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }
.oc-main { display: flex; align-items: center; gap: 32px; flex: 1; flex-wrap: wrap; }
.oc-id-col { display: flex; flex-direction: column; gap: 6px; min-width: 110px; }
.oc-id { font-family: monospace; font-weight: 700; color: #1e3a8a; }
.oc-info { min-width: 160px; }
.oc-fuel { font-weight: 700; color: #1a2744; font-size: 1.02rem; }
.oc-sub { font-size: .82rem; color: #64748b; }
.oc-field { display: flex; flex-direction: column; gap: 4px; }
.oc-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .4px; color: #94a3b8; }
.oc-value { font-weight: 600; color: #1a2744; }
.oc-value.strong { color: #1e3a8a; font-size: 1.05rem; }
.oc-actions { display: flex; align-items: center; min-width: 180px; justify-content: flex-end; }
.oc-hint { font-size: .82rem; color: #94a3b8; }
.oc-hint.done { color: #059669; display: flex; align-items: center; gap: 6px; }

.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: .75rem; }

@media (max-width: 800px) {
  .order-card { flex-direction: column; align-items: stretch; }
  .oc-actions { justify-content: flex-start; }
}
</style>
