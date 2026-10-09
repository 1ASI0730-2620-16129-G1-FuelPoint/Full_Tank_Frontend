<script setup>
/**
 * Equipment page (buyer). Route-level coordinator. Equipment cards emit events
 * (`request-refill`, `toggle-auto`, `edit`, `delete`); this page handles them.
 * Refill requests go through the shared coordination service, which validates
 * stock and creates the request / no-stock notification — the page and cards
 * never touch the Ordering, Inventory or Notification stores.
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import useEquipmentStore from '../../application/equipment.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { requestManualRefill, triggerAutoRefill } from '../../../shared/application/coordination.service.js';
import EquipmentCard from '../components/equipment-card.vue';
import pinia from '../../../pinia.js';

const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const confirm = useConfirm();
const equipmentStore = useEquipmentStore(pinia);
const iamStore = useIamStore(pinia);

onMounted(async () => {
  if (!equipmentStore.loaded) await equipmentStore.fetchEquipment();
  if (!iamStore.providerCompanies.length) await iamStore.fetchDirectories();
});

const companyId = computed(() => iamStore.currentCompanyId);
const items = computed(() => equipmentStore.forCompany(companyId.value));

const kpiTotal = computed(() => items.value.length);
const kpiNeedRefill = computed(() => items.value.filter(e => e.needsRefill()).length);
const kpiAuto = computed(() => items.value.filter(e => e.autoRefill).length);
const kpiAvgFill = computed(() => {
  if (!items.value.length) return 0;
  return Math.round(items.value.reduce((s, e) => s + e.fillPercentage(), 0) / items.value.length);
});

function providerName(id) {
  return iamStore.providerCompanies.find(p => p.id === id)?.name ?? '';
}

function addEquipment() { router.push('/equipment/new'); }
function editEquipment(item) { router.push(`/equipment/${item.id}/edit`); }

function removeEquipment(item) {
  confirm.require({
    message: t('equipment.confirm-delete', { name: item.name }),
    header: t('equipment.delete'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      equipmentStore.deleteEquipment(item);
      toast.add({ severity: 'info', summary: t('equipment.deleted'), life: 3000 });
    },
  });
}

function toggleAuto(item) {
  equipmentStore.updateEquipment({ ...item, autoRefill: !item.autoRefill });
}

async function onRequestRefill(item) {
  const result = await requestManualRefill(item);
  if (result.ok) {
    toast.add({ severity: 'success', summary: t('equipment.refill-requested'), detail: item.name, life: 4000 });
    return;
  }
  // No favorite provider, or the favorite provider is out of stock: explain
  // clearly and offer to go to the catalog to pick another provider.
  const detail = result.reason === 'NO_STOCK'
    ? t('equipment.refill-no-stock', { name: item.name })
    : t('equipment.refill-no-provider', { name: item.name });
  confirm.require({
    message: detail,
    header: t('equipment.refill-failed'),
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: t('equipment.go-catalog'),
    rejectLabel: t('common.close'),
    accept: () => router.push('/catalog'),
  });
}

async function runAutoRefill() {
  const targets = items.value.filter(e => e.autoRefill && e.needsRefill());
  if (!targets.length) {
    toast.add({ severity: 'info', summary: t('equipment.auto-none'), life: 3000 });
    return;
  }
  let created = 0, failed = 0;
  for (const item of targets) {
    const r = await triggerAutoRefill(item);
    r.ok ? created++ : failed++;
  }
  toast.add({
    severity: failed ? 'warn' : 'success',
    summary: t('equipment.auto-done'),
    detail: t('equipment.auto-summary', { created, failed }),
    life: 5000,
  });
}
</script>

<template>
  <div class="eq-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('equipment.title') }}</h1>
        <p class="page-subtitle">{{ t('equipment.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <pv-button :label="t('equipment.run-auto')" icon="pi pi-sync" outlined @click="runAutoRefill"/>
        <pv-button :label="t('equipment.add')" icon="pi pi-plus" @click="addEquipment"/>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-row">
      <div class="kpi"><span class="kpi-num">{{ kpiTotal }}</span><span class="kpi-lbl">{{ t('equipment.kpi-total') }}</span></div>
      <div class="kpi warn"><span class="kpi-num">{{ kpiNeedRefill }}</span><span class="kpi-lbl">{{ t('equipment.kpi-refill') }}</span></div>
      <div class="kpi"><span class="kpi-num">{{ kpiAuto }}</span><span class="kpi-lbl">{{ t('equipment.kpi-auto') }}</span></div>
      <div class="kpi"><span class="kpi-num">{{ kpiAvgFill }}%</span><span class="kpi-lbl">{{ t('equipment.kpi-avg') }}</span></div>
    </div>

    <div v-if="equipmentStore.loading" class="state-msg">{{ t('common.loading') }}</div>

    <div v-else-if="items.length === 0" class="empty-state">
      <i class="pi pi-cog"/>
      <p>{{ t('equipment.empty') }}</p>
      <pv-button :label="t('equipment.add')" icon="pi pi-plus" @click="addEquipment"/>
    </div>

    <div v-else class="eq-grid">
      <EquipmentCard
          v-for="item in items"
          :key="item.id"
          :equipment="item"
          :provider-name="providerName(item.favoriteProviderId)"
          @edit="editEquipment"
          @delete="removeEquipment"
          @request-refill="onRequestRefill"
          @toggle-auto="toggleAuto"
      />
    </div>
  </div>
</template>

<style scoped>
.eq-page { display: flex; flex-direction: column; gap: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }
.header-actions { display: flex; gap: 10px; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 14px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; }
.kpi.warn { border-color: #fcd34d; background: #fffbeb; }
.kpi-num { font-size: 1.8rem; font-weight: 700; color: #1a2744; }
.kpi-lbl { font-size: .78rem; color: #94a3b8; text-transform: uppercase; letter-spacing: .4px; }

.eq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
.state-msg { padding: 2rem; text-align: center; color: #8b9ab5; }
.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-state i { font-size: 2.5rem; }
</style>
