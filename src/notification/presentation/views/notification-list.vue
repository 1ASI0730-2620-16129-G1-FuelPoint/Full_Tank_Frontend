<script setup>
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import useNotificationStore from '../../application/notification.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import pinia from '../../../pinia.js';

const { t } = useI18n();
const router = useRouter();
const notificationStore = useNotificationStore(pinia);
const iamStore = useIamStore(pinia);

onMounted(() => {
  if (!notificationStore.loaded) notificationStore.fetchNotifications();
});

const items = computed(() =>
  iamStore.isProvider
    ? notificationStore.forProvider(iamStore.currentProviderId)
    : notificationStore.forBuyer(iamStore.currentCompanyId)
);

const unread = computed(() => items.value.filter(n => !n.read).length);

const iconMap = {
  NEW_REQUEST: 'pi pi-inbox',
  LOW_STOCK: 'pi pi-exclamation-triangle',
  REQUEST_APPROVED: 'pi pi-check-circle',
  REQUEST_REJECTED: 'pi pi-times-circle',
  ORDER_CREATED: 'pi pi-shopping-cart',
  ORDER_DISPATCHED: 'pi pi-truck',
  ORDER_DELIVERED: 'pi pi-flag',
  ORDER_CANCELLED: 'pi pi-ban',
  PAYMENT_REGISTERED: 'pi pi-credit-card',
  INVOICE_GENERATED: 'pi pi-file',
  EQUIPMENT_LOW: 'pi pi-cog',
  NO_STOCK: 'pi pi-exclamation-circle',
};

const colorMap = {
  NEW_REQUEST: '#2563eb',
  LOW_STOCK: '#f59e0b',
  REQUEST_APPROVED: '#059669',
  REQUEST_REJECTED: '#dc2626',
  ORDER_DELIVERED: '#059669',
  PAYMENT_REGISTERED: '#2563eb',
  INVOICE_GENERATED: '#6366f1',
  EQUIPMENT_LOW: '#f59e0b',
  NO_STOCK: '#dc2626',
};

const fallbackTitleKeys = {
  NEW_REQUEST: 'notification.new-request-title',
  ORDER_CREATED: 'notification.order-created-title',
  NO_STOCK: 'notification.no-stock-title',
  REQUEST_APPROVED: 'notification.request-approved-title',
  REQUEST_REJECTED: 'notification.request-rejected-title',
  ORDER_DISPATCHED: 'notification.order-dispatched-title',
  ORDER_DELIVERED: 'notification.order-received-title',
  PAYMENT_REGISTERED: 'notification.payment-registered-title',
  INVOICE_GENERATED: 'notification.invoice-generated-title',
  ORDER_CANCELLED: 'notification.order-cancelled-title',
};

const fallbackMessageKeys = {
  NEW_REQUEST: 'notification.fallback-new-request-msg',
  ORDER_CREATED: 'notification.fallback-order-created-msg',
  NO_STOCK: 'notification.fallback-no-stock-msg',
  REQUEST_APPROVED: 'notification.fallback-request-approved-msg',
  REQUEST_REJECTED: 'notification.fallback-request-rejected-msg',
  ORDER_DISPATCHED: 'notification.fallback-order-dispatched-msg',
  ORDER_DELIVERED: 'notification.fallback-order-delivered-msg',
  PAYMENT_REGISTERED: 'notification.fallback-payment-registered-msg',
  INVOICE_GENERATED: 'notification.fallback-invoice-generated-msg',
  ORDER_CANCELLED: 'notification.fallback-order-cancelled-msg',
};

function icon(type) { return iconMap[type] ?? 'pi pi-bell'; }
function color(type) { return colorMap[type] ?? '#64748b'; }

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Localized text from i18n keys when present, falling back to the stored fixed
// title/message for older (seed) notifications.
function readableType(type) {
  return String(type || 'Notification')
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
}

function notifTitle(n) {
  if (n.titleKey) return t(n.titleKey, n.params || {});
  if (n.title) return n.title;
  const fallbackKey = fallbackTitleKeys[n.type];
  return fallbackKey ? t(fallbackKey) : readableType(n.type);
}

function notifMessage(n) {
  if (n.messageKey) return t(n.messageKey, n.params || {});
  if (n.message) return n.message;
  const fallbackKey = fallbackMessageKeys[n.type];
  return fallbackKey ? t(fallbackKey, { id: n.relatedId ?? '' }) : t('notification.fallback-default-msg');
}

/**
 * Resolves the in-app route a notification points to, based on its type and the
 * active segment. Returns null when the type has no meaningful destination.
 * @param {{type:string, relatedId?:(number|string|null)}} n
 * @returns {string|null}
 */
function routeFor(n) {
  const isProvider = iamStore.isProvider;
  const id = n.relatedId;
  switch (n.type) {
    case 'NEW_REQUEST':
      return '/ordering/pending';
    case 'ORDER_CREATED':
      // The buyer just submitted a request; no order exists yet, so track the
      // request itself (not "My Orders").
      return isProvider ? '/ordering/orders' : '/ordering/my-requests';
    case 'REQUEST_REJECTED':
      return '/ordering/my-requests';
    case 'REQUEST_APPROVED':
    case 'ORDER_DISPATCHED':
    case 'ORDER_DELIVERED':
    case 'ORDER_CANCELLED':
      // Open the specific order's detail (timeline) rather than the list.
      if (isProvider) return id ? `/ordering/orders/${id}` : '/ordering/orders';
      return id ? `/ordering/my-orders/${id}` : '/ordering/my-orders';
    case 'PAYMENT_REGISTERED':
      // Land on the payment history (where the new payment shows), not the
      // "Pending" tab which is empty right after paying.
      return isProvider ? '/reporting/provider' : '/payment?tab=history';
    case 'INVOICE_GENERATED':
      // Open the invoice viewer for this order directly (relatedId = order id).
      return isProvider ? '/reporting/provider' : (id ? `/payment?invoice=${id}` : '/payment');
    case 'LOW_STOCK':
      // Provider-side inventory alert. A buyer should never land on the
      // provider's inventory screen.
      return isProvider ? '/inventory/products' : null;
    case 'NO_STOCK':
      // Buyer auto-refill couldn't find stock at the favorite provider: send the
      // buyer to the catalog to pick another provider; provider sees inventory.
      return isProvider ? '/inventory/products' : '/catalog';
    case 'EQUIPMENT_LOW':
      return isProvider ? null : '/equipment';
    default:
      return null;
  }
}

function onRead(notification) {
  notificationStore.markAsRead(notification);
  const to = routeFor(notification);
  if (to) router.push(to);
}

function readAll() {
  if (iamStore.isProvider) notificationStore.markAllAsRead('PROVIDER', iamStore.currentProviderId);
  else notificationStore.markAllAsRead('BUYER', iamStore.currentCompanyId);
}
</script>

<template>
  <div class="notif-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('notification.title') }}</h1>
        <p class="page-subtitle">{{ t('notification.subtitle') }}</p>
      </div>
      <pv-button
          v-if="unread > 0"
          :label="t('notification.mark-all-read')"
          icon="pi pi-check"
          outlined
          @click="readAll"
      />
    </div>

    <div v-if="notificationStore.loading" class="state-msg">{{ t('common.loading') }}</div>

    <div v-else-if="items.length === 0" class="empty-state">
      <i class="pi pi-bell-slash"/>
      <p>{{ t('notification.empty') }}</p>
    </div>

    <div v-else class="notif-list">
      <div
          v-for="n in items"
          :key="n.id"
          class="notif-item"
          :class="{ unread: !n.read }"
          @click="onRead(n)"
      >
        <div class="notif-icon" :style="{ background: color(n.type) + '1a', color: color(n.type) }">
          <i :class="icon(n.type)"/>
        </div>
        <div class="notif-body">
          <div class="notif-top">
            <span class="notif-title">{{ notifTitle(n) }}</span>
            <span class="notif-date">{{ formatDate(n.createdAt) }}</span>
          </div>
          <p class="notif-message">{{ notifMessage(n) }}</p>
        </div>
        <span v-if="!n.read" class="dot"/>
        <i v-if="routeFor(n)" class="pi pi-chevron-right go-arrow"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notif-page { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }

.state-msg { padding: 2rem; text-align: center; color: #8b9ab5; }
.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: .75rem; }

.notif-list { display: flex; flex-direction: column; gap: 10px; }
.notif-item {
  display: flex; align-items: flex-start; gap: 14px; background: #fff;
  border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px;
  cursor: pointer; transition: box-shadow .15s, transform .1s; position: relative;
}
.notif-item:hover { box-shadow: 0 4px 14px rgba(0,0,0,.06); }
.notif-item.unread { background: #f8fbff; border-color: #bfdbfe; }
.notif-icon {
  width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 1.15rem;
}
.notif-body { flex: 1; min-width: 0; }
.notif-top { display: flex; justify-content: space-between; gap: 1rem; }
.notif-title { font-weight: 600; color: #1a2744; font-size: .95rem; }
.notif-date { font-size: .78rem; color: #94a3b8; white-space: nowrap; }
.notif-message { margin: 4px 0 0; color: #4a5568; font-size: .88rem; line-height: 1.4; }
.dot { width: 9px; height: 9px; border-radius: 50%; background: #2563eb; flex-shrink: 0; margin-top: 6px; }
.go-arrow { color: #cbd5e1; font-size: .8rem; align-self: center; transition: color .15s, transform .15s; }
.notif-item:hover .go-arrow { color: #2563eb; transform: translateX(2px); }
</style>
