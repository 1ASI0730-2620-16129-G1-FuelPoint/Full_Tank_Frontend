<script setup>
/**
 * Buyer "My Requests" page. Read-only view of the requests submitted by the
 * current buyer company, scoped through the Ordering store's read model.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import useOrderingStore from '../../application/ordering.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { formatDate as fmtDate } from '../../../shared/domain/helpers.js';
import pinia from '../../../pinia.js';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);

// Strong confirmation: a persistent success banner shown when arriving right
// after submitting a request (complements the transient toast).
const justCreated = ref(route.query.created === '1');
function dismissBanner() {
  justCreated.value = false;
  router.replace({ query: {} });
}

// Requests are always created from the Catalog (the single source of truth for
// provider stock, equipment capacity and fuel compatibility), so the CTA routes
// the buyer there instead of opening a standalone form.
function goNewRequest() { router.push('/catalog'); }

onMounted(() => {
  if (!store.requestsLoaded) store.fetchRequests();
  if (!iamStore.providerCompanies.length) iamStore.fetchDirectories();
});

const requests = computed(() =>
  [...store.requestsForBuyer(iamStore.currentCompanyId)]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
);

function providerName(id) {
  return iamStore.providerCompanies.find(p => p.id === id)?.name ?? `Provider #${id}`;
}
// Translate the stored rejection reason code at display time (locale-aware),
// appending the free-text note when present.
function rejectionLabel(req) {
  if (!req.rejectionReasonCode) return '';
  const base = t('ordering.reason-' + req.rejectionReasonCode.toLowerCase().replace(/_/g, '-'));
  return req.rejectionReasonNote ? `${base}: ${req.rejectionReasonNote}` : base;
}
function statusSeverity(status) {
  return { PENDING: 'warn', APPROVED: 'success', REJECTED: 'danger' }[status] ?? 'info';
}
function formatDate(val) {
  return val ? fmtDate(val, locale.value) : '—';
}
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('ordering.my-requests-title') }}</h1>
        <p class="page-subtitle">{{ t('ordering.my-requests-subtitle') }}</p>
      </div>
      <div class="header-actions">
        <pv-button icon="pi pi-refresh" text rounded :loading="store.loading" @click="store.fetchRequests()"/>
        <pv-button :label="t('ordering.new-request')" icon="pi pi-plus" @click="goNewRequest"/>
      </div>
    </div>

    <pv-message v-if="justCreated" severity="success" :closable="true" class="created-banner" @close="dismissBanner">
      <i class="pi pi-check-circle"/> {{ t('ordering.request-created-banner') }}
    </pv-message>

    <pv-card>
      <template #content>
        <pv-data-table :value="requests" :loading="store.loading" striped-rows>
          <pv-column :header="t('ordering.col-request-id')">
            <template #body="{ data }"><span class="mono">#{{ data.id }}</span></template>
          </pv-column>
          <pv-column :header="t('ordering.col-provider')">
            <template #body="{ data }">{{ providerName(data.providerId) }}</template>
          </pv-column>
          <pv-column :header="t('ordering.col-fuel-type')">
            <template #body="{ data }">{{ fuelTypeLabel(data.fuelType) }}</template>
          </pv-column>
          <pv-column :header="t('ordering.col-quantity')">
            <template #body="{ data }">{{ data.quantity }} {{ data.unit === 'LITERS' ? 'L' : 'gal' }}</template>
          </pv-column>
          <pv-column :header="t('ordering.col-address')">
            <template #body="{ data }"><span class="addr" :title="data.deliveryAddress">{{ data.deliveryAddress || '—' }}</span></template>
          </pv-column>
          <pv-column :header="t('ordering.col-source')">
            <template #body="{ data }"><pv-tag :value="t('ordering.source-' + (data.source || 'MANUAL'))" severity="secondary"/></template>
          </pv-column>
          <pv-column :header="t('ordering.col-date')">
            <template #body="{ data }">{{ formatDate(data.deliveryDate) }}</template>
          </pv-column>
          <pv-column :header="t('ordering.col-created')">
            <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
          </pv-column>
          <pv-column :header="t('common.status')">
            <template #body="{ data }">
              <div class="status-cell">
                <pv-tag :value="t('ordering.status-' + data.status)" :severity="statusSeverity(data.status)"/>
                <span v-if="data.status === 'REJECTED' && data.rejectionReasonCode" class="reject-reason" :title="rejectionLabel(data)">
                  <i class="pi pi-info-circle"/> {{ rejectionLabel(data) }}
                </span>
              </div>
            </template>
          </pv-column>
          <template #empty>
            <div class="empty-row">
              <i class="pi pi-inbox empty-icon"/>
              <p class="empty-title">{{ t('ordering.no-requests') }}</p>
              <p class="empty-hint">{{ t('ordering.no-requests-hint') }}</p>
              <pv-button :label="t('ordering.new-request')" icon="pi pi-plus" @click="goNewRequest"/>
            </div>
          </template>
        </pv-data-table>
      </template>
    </pv-card>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.mono { font-family: monospace; font-weight: 600; color: #1e3a8a; }
.created-banner { margin: 0; }
.addr { display: inline-block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.status-cell { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
.reject-reason { font-size: .72rem; color: #b91c1c; display: inline-flex; align-items: center; gap: 4px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-row { text-align: center; color: #94a3b8; padding: 2.5rem; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.empty-icon { font-size: 2.2rem; color: #cbd5e1; }
.empty-title { font-weight: 600; color: #475569; margin: 6px 0 0; }
.empty-hint { font-size: .88rem; color: #94a3b8; margin: 0 0 8px; max-width: 360px; }
</style>
