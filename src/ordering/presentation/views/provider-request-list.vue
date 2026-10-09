<script setup>
/**
 * Provider pending-requests page. Route-level coordinator: accept/reject go
 * through the shared coordination service, which checks Inventory stock,
 * creates the Order and notifies the buyer. Requests are shown as horizontal
 * cards and reference the buyer company name (not a raw client id).
 */
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import useOrderingStore from "../../application/ordering.store.js";
import useIamStore from "../../../iam/application/iam.store.js";
import { acceptRequest, rejectRequest as rejectRequestUseCase } from "../../../shared/application/coordination.service.js";
import { fuelTypeLabel } from "../../../shared/domain/fuel-types.js";
import { unitSuffix, formatDate as fmtDate } from "../../../shared/domain/helpers.js";
import pinia from "../../../pinia.js";

const confirm = useConfirm();
const toast = useToast();
const { t, locale } = useI18n();

function formatDate(val) {
  return val ? fmtDate(val, locale.value) : '—';
}
const store = useOrderingStore(pinia);
const iamStore = useIamStore(pinia);

const loading = computed(() => store.loading);
const errors = computed(() => store.errors);
const pendingRequests = computed(() =>
  store.requestsForProvider(iamStore.currentProviderId)
    .filter(r => r.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
);

function buyerName(id) {
  return iamStore.buyerCompanies.find(c => c.id === id)?.name ?? `Company #${id}`;
}

const onRefresh = () => {
  store.clearErrors();
  store.fetchRequests();
};

const confirmApprove = (request) => {
  confirm.require({
    message: t('ordering.approve-msg', { id: request.id, qty: request.quantity, unit: unitSuffix(request.unit), fuel: fuelTypeLabel(request.fuelType) }),
    header: t('ordering.approve'),
    icon: 'pi pi-check-circle',
    acceptClass: 'p-button-success',
    accept: async () => {
      const result = await acceptRequest(request);
      if (result.ok) {
        toast.add({ severity: 'success', summary: t('ordering.accepted'), life: 4000 });
      } else {
        toast.add({ severity: 'warn', summary: t('ordering.no-stock-warning'), life: 4000 });
      }
    },
  });
};

// ── Reject with reason ───────────────────────────────────────────────────────
const rejectVisible = ref(false);
const rejectTarget = ref(null);
const rejectReason = ref('NO_STOCK');
const rejectNote = ref('');

const reasonOptions = computed(() => [
  { label: t('ordering.reason-no-stock'),    value: 'NO_STOCK' },
  { label: t('ordering.reason-out-of-zone'), value: 'OUT_OF_ZONE' },
  { label: t('ordering.reason-date'),        value: 'DATE' },
  { label: t('ordering.reason-quantity'),    value: 'QUANTITY' },
  { label: t('ordering.reason-other'),       value: 'OTHER' },
]);

function openReject(request) {
  rejectTarget.value = request;
  rejectReason.value = 'NO_STOCK';
  rejectNote.value = '';
  rejectVisible.value = true;
}

async function doReject() {
  if (!rejectTarget.value) return;
  const note = rejectReason.value === 'OTHER' ? rejectNote.value.trim() : '';
  await rejectRequestUseCase(rejectTarget.value, { code: rejectReason.value, note });
  rejectVisible.value = false;
  toast.add({ severity: 'info', summary: t('ordering.rejected-ok'), life: 3000 });
}

onMounted(() => {
  store.clearErrors();
  if (!store.requestsLoaded) store.fetchRequests();
  if (!iamStore.buyerCompanies.length) iamStore.fetchDirectories();
});
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-group">
        <h1 class="page-title">{{ t('ordering.page-title') }}</h1>
        <p class="page-subtitle">{{ t('ordering.page-subtitle') }}</p>
      </div>
      <pv-button icon="pi pi-refresh" text rounded class="refresh-btn" :loading="loading" @click="onRefresh" />
    </div>

    <pv-message v-if="errors.length" severity="error" class="error-banner">
      {{ t('errors.fetch') }}: {{ errors[0]?.message || 'Unknown Error' }}
    </pv-message>

    <div v-if="!pendingRequests.length && !loading" class="empty-state">
      <i class="pi pi-inbox"/>
      <p>{{ t('ordering.no-pending') }}</p>
    </div>

    <div v-else class="request-cards">
      <div v-for="req in pendingRequests" :key="req.id" class="request-card">
        <div class="rc-left">
          <span class="rc-id">#{{ req.id }}</span>
          <span class="rc-company">{{ buyerName(req.companyId ?? req.clientId) }}</span>
          <span class="fuel-chip">{{ fuelTypeLabel(req.fuelType) }}</span>
        </div>

        <div class="rc-mid">
          <div class="rc-field">
            <span class="rc-label">{{ t('ordering.col-quantity') }}</span>
            <span class="rc-value">{{ req.quantity }} {{ unitSuffix(req.unit) }}</span>
          </div>
          <div class="rc-field">
            <span class="rc-label">{{ t('ordering.col-address') }}</span>
            <span class="rc-value">{{ req.deliveryAddress?.split(',')[0] }}</span>
          </div>
          <div class="rc-field">
            <span class="rc-label">{{ t('ordering.col-date') }}</span>
            <span class="rc-value">{{ formatDate(req.deliveryDate) }}</span>
          </div>
          <div class="rc-field">
            <span class="rc-label">{{ t('ordering.col-source') }}</span>
            <pv-tag :value="t('ordering.source-' + (req.source || 'MANUAL'))" severity="secondary"/>
          </div>
        </div>

        <div class="rc-actions">
          <pv-button :label="t('ordering.accept')" icon="pi pi-check" severity="success" size="small" @click="confirmApprove(req)" />
          <pv-button :label="t('ordering.reject')" icon="pi pi-times" severity="danger" outlined size="small" @click="openReject(req)" />
        </div>
      </div>
    </div>

    <!-- Reject reason dialog -->
    <pv-dialog v-model:visible="rejectVisible" modal :header="t('ordering.reject')" :style="{ width: '440px' }">
      <div class="reject-form">
        <p class="reject-intro">{{ t('ordering.reject-reason-intro') }}</p>
        <label class="reject-lbl">{{ t('ordering.reject-reason') }}</label>
        <pv-select v-model="rejectReason" :options="reasonOptions" option-label="label" option-value="value" class="w-full"/>
        <template v-if="rejectReason === 'OTHER'">
          <label class="reject-lbl">{{ t('ordering.reject-note') }}</label>
          <pv-textarea v-model="rejectNote" rows="2" class="w-full" :placeholder="t('ordering.reject-note')"/>
        </template>
      </div>
      <template #footer>
        <pv-button :label="t('common.cancel')" text @click="rejectVisible = false"/>
        <pv-button :label="t('ordering.reject')" icon="pi pi-times" severity="danger" @click="doReject"/>
      </template>
    </pv-dialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1rem; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title { font-size: 1.6rem; font-weight: 700; color: #1E3A8A; margin: 0; }
.page-subtitle { color: #6B7280; font-size: 0.9rem; margin: 0.25rem 0 0 0; }
.refresh-btn { color: #1E3A8A; }

.error-banner { margin-bottom: .5rem; }

.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: .75rem; }

.request-cards { display: flex; flex-direction: column; gap: 12px; }
.request-card {
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px 22px;
  transition: box-shadow .15s;
}
.request-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.06); }

.rc-left { display: flex; flex-direction: column; gap: 6px; min-width: 200px; }
.rc-id { font-family: monospace; font-weight: 700; color: #94a3b8; font-size: .82rem; }
.rc-company { font-weight: 700; color: #1a2744; font-size: 1.02rem; }
.fuel-chip { align-self: flex-start; background: #eff6ff; color: #1e3a8a; border-radius: 6px; padding: 2px 10px; font-size: .74rem; font-weight: 600; }

.rc-mid { display: flex; align-items: center; gap: 36px; flex: 1; flex-wrap: wrap; }
.rc-field { display: flex; flex-direction: column; gap: 4px; }
.rc-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .4px; color: #94a3b8; }
.rc-value { font-weight: 600; color: #1a2744; }

.rc-actions { display: flex; gap: 8px; align-items: center; min-width: 220px; justify-content: flex-end; }

.reject-form { display: flex; flex-direction: column; gap: 8px; }
.reject-intro { margin: 0 0 4px; color: #64748b; font-size: .88rem; }
.reject-lbl { font-size: .8rem; font-weight: 600; color: #475569; margin-top: 4px; }
.reject-form .w-full { width: 100%; }

@media (max-width: 900px) {
  .request-card { flex-direction: column; align-items: stretch; }
  .rc-actions { justify-content: flex-start; }
}
</style>
