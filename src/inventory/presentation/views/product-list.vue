<script setup>
/**
 * Provider inventory page. Shows fuel tanks as responsive cards with available
 * stock and fill level. Empty / low tanks expose a Refill action that simulates
 * automatic replenishment. Inventory feeds the buyer Catalog.
 */
import { useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import useInventoryStore from "../../application/inventory.store.js";
import useIamStore from "../../../iam/application/iam.store.js";
import { fuelTypeLabel } from "../../../shared/domain/fuel-types.js";
import { unitSuffix } from "../../../shared/domain/helpers.js";
import pinia from "../../../pinia.js";

const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const { t } = useI18n();
const store = useInventoryStore(pinia);
const iamStore = useIamStore(pinia);

onMounted(() => {
  if (!store.productsLoaded) store.fetchProducts();
});

// Scope tanks to the active provider (fall back to all when not scoped).
const items = computed(() => {
  const pid = iamStore.currentProviderId;
  const scoped = store.products.filter(p => p.providerId === pid);
  return scoped.length ? scoped : store.products.filter(p => p.providerId == null);
});

const navigateToNew = () => router.push({ name: 'inventory-product-new' });
const navigateToEdit = (id) => router.push({ name: 'inventory-product-edit', params: { id } });

function fillPct(item) { return item.fillPercentage(); }
function availablePct(item) { return item.capacity ? Math.round((item.availableStock() / item.capacity) * 100) : 0; }
function barColor(item) {
  if (item.status !== 'ACTIVE') return '#94a3b8';
  const pct = item.fillPercentage();
  if (pct <= 10) return '#dc2626';
  if (item.isLowStock()) return '#f59e0b';
  return '#2563eb';
}
function canRefill(item) { return item.stock === 0 || item.isLowStock(); }

const confirmDelete = (item) => {
  confirm.require({
    message: t('inventory.confirm-delete', { name: item.name }),
    header: t('common.delete'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (await store.deleteProduct(item)) {
        toast.add({ severity: 'info', summary: t('inventory.deleted'), life: 3000 });
      }
    }
  });
};

async function refill(item) {
  try {
    const updated = await store.refillStock(item);
    if (!updated) {
      const lastError = store.errors[store.errors.length - 1];
      toast.add({
        severity: 'error',
        summary: t('inventory.refill-failed'),
        detail: lastError?.message || item.name,
        life: 4000
      });
      return;
    }
    toast.add({ severity: 'success', summary: t('inventory.refilled'), detail: item.name, life: 3500 });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: t('inventory.refill-failed'),
      detail: err?.message || item.name,
      life: 4000
    });
  }
}
</script>

<template>
  <div class="inv-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('inventory.product-list.title') }}</h1>
        <p class="page-subtitle">{{ t('inventory.product-list.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <pv-button icon="pi pi-refresh" text rounded :loading="store.loading" @click="store.fetchProducts()" />
        <pv-button :label="t('inventory.add-product')" icon="pi pi-plus" @click="navigateToNew" />
      </div>
    </div>

    <pv-message v-if="store.errors.length" severity="error" class="error-banner">
      {{ t('errors.fetch') }}: {{ store.errors[0]?.message || 'Unknown Error' }}
    </pv-message>

    <div v-if="!items.length && !store.loading" class="empty-state">
      <i class="pi pi-box"/>
      <p>{{ t('inventory.product-list.no-products') }}</p>
      <pv-button :label="t('inventory.add-product')" icon="pi pi-plus" @click="navigateToNew"/>
    </div>

    <div v-else class="tank-grid">
      <div v-for="item in items" :key="item.id" class="tank-card" :class="{ disabled: item.status !== 'ACTIVE' }">
        <div class="tc-head">
          <div class="tc-icon"><i class="pi pi-database"/></div>
          <div class="tc-title">
            <div class="tc-name">{{ item.name }}</div>
            <span class="fuel-chip">{{ fuelTypeLabel(item.type) }}</span>
          </div>
          <pv-tag
              :value="item.status === 'ACTIVE' ? t('inventory.status-active') : t('inventory.status-disabled')"
              :severity="item.status === 'ACTIVE' ? 'success' : 'secondary'"
          />
        </div>

        <div class="tc-level">
          <div class="level-top">
            <span>{{ t('inventory.capacity-used') }}</span>
            <span class="level-val">{{ item.stock.toLocaleString() }} / {{ item.capacity.toLocaleString() }} {{ unitSuffix(item.unit) }}</span>
          </div>
          <div class="bar"><div class="bar-fill" :style="{ width: fillPct(item) + '%', background: barColor(item) }"/></div>

          <div class="metrics">
            <div class="metric">
              <span class="m-lbl">{{ t('inventory.physical') }}</span>
              <span class="m-val">{{ item.stock.toLocaleString() }}</span>
            </div>
            <div class="metric">
              <span class="m-lbl">{{ t('inventory.reserved-label') }}</span>
              <span class="m-val res">{{ item.reserved.toLocaleString() }}</span>
            </div>
            <div class="metric">
              <span class="m-lbl">{{ t('inventory.available') }}</span>
              <span class="m-val avail">{{ item.availableStock().toLocaleString() }} <small>({{ availablePct(item) }}%)</small></span>
            </div>
          </div>

          <div v-if="item.isLowStock()" class="level-bottom">
            <span class="low-tag"><i class="pi pi-exclamation-triangle"/> {{ t('inventory.low-stock') }}</span>
          </div>
        </div>

        <div class="tc-meta">
          <span class="price">S/ {{ Number(item.pricePerLiter).toFixed(2) }}<span class="per">/{{ unitSuffix(item.unit) }}</span></span>
          <div class="icon-actions">
            <pv-button icon="pi pi-pencil" text rounded size="small" @click="navigateToEdit(item.id)" />
            <pv-button icon="pi pi-trash" text rounded size="small" severity="danger" @click="confirmDelete(item)" />
          </div>
        </div>

        <pv-button
            v-if="canRefill(item)"
            :label="t('inventory.refill')"
            icon="pi pi-bolt"
            size="small"
            severity="warn"
            class="refill-btn"
            @click="refill(item)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.inv-page { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title { font-size: 1.6rem; font-weight: 700; color: #1E3A8A; margin: 0; }
.page-subtitle { color: #6B7280; font-size: 0.9rem; margin: 0.25rem 0 0; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.error-banner { margin-bottom: .25rem; }

.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-state i { font-size: 2.5rem; }

.tank-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
.tank-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 14px; transition: box-shadow .15s; }
.tank-card:hover { box-shadow: 0 6px 18px rgba(0,0,0,.07); }
.tank-card.disabled { opacity: .75; }

.tc-head { display: flex; align-items: center; gap: 12px; }
.tc-icon { width: 42px; height: 42px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.tc-title { flex: 1; }
.tc-name { font-weight: 700; color: #1a2744; }
.fuel-chip { display: inline-block; background: #eef2f7; color: #475569; border-radius: 6px; padding: 1px 8px; font-size: .72rem; font-weight: 600; margin-top: 3px; }

.tc-level { background: #f8fafc; border-radius: 10px; padding: 10px 12px; }
.level-top { display: flex; justify-content: space-between; font-size: .78rem; color: #64748b; }
.level-val { font-weight: 600; color: #1a2744; }
.bar { height: 8px; background: #e5e7eb; border-radius: 999px; margin: 6px 0 4px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; transition: width .3s; }
.level-bottom { display: flex; justify-content: flex-end; align-items: center; margin-top: 8px; }
.low-tag { font-size: .72rem; color: #b45309; }

.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px; }
.metric { display: flex; flex-direction: column; gap: 2px; background: #fff; border: 1px solid #eef2f7; border-radius: 8px; padding: 6px 8px; }
.m-lbl { font-size: .64rem; text-transform: uppercase; letter-spacing: .3px; color: #94a3b8; font-weight: 600; }
.m-val { font-size: .92rem; font-weight: 700; color: #1a2744; }
.m-val small { font-size: .68rem; font-weight: 600; color: #94a3b8; }
.m-val.res { color: #b45309; }
.m-val.avail { color: #059669; }

.tc-meta { display: flex; justify-content: space-between; align-items: center; }
.price { font-weight: 700; color: #1a2744; }
.per { font-size: .78rem; color: #94a3b8; font-weight: 400; }
.icon-actions { display: flex; gap: 2px; }
.refill-btn { width: 100%; justify-content: center; }
</style>
