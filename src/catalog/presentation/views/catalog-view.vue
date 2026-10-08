<script setup>
/**
 * Catalog page (buyer). Lists providers with search, fuel-type filter, favorites
 * and a compare tool. Uses only the Catalog store; navigation to a provider's
 * detail is by route. Compatibility filtering uses equipment fuel types obtained
 * from the shared application read service (not the Equipment store directly).
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import useCatalogStore from '../../application/catalog.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { listCompanyEquipment } from '../../../shared/application/coordination.service.js';
import { FUEL_TYPES, fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import ProviderCard from '../components/provider-card.vue';
import pinia from '../../../pinia.js';

const router = useRouter();
const { t } = useI18n();
const catalogStore = useCatalogStore(pinia);
const iamStore = useIamStore(pinia);

const search = ref('');
const fuelType = ref('');
const onlyFavorites = ref(false);
const onlyCompatible = ref(false);
const compareList = ref([]);
const compareVisible = ref(false);
const equipmentTypes = ref([]);

const fuelOptions = [{ code: '', label: t('catalog.all-fuels') }, ...FUEL_TYPES];

onMounted(async () => {
  if (!catalogStore.loaded || String(catalogStore.loadedCompanyId) !== String(iamStore.currentCompanyId)) {
    await catalogStore.fetchCatalog(iamStore.currentCompanyId);
  }
  const equipment = await listCompanyEquipment(iamStore.currentCompanyId);
  equipmentTypes.value = [...new Set(equipment.map(e => e.requiredFuelType))];
});

const providers = computed(() =>
  catalogStore.filteredProviders({
    search: search.value,
    fuelType: fuelType.value,
    onlyFavorites: onlyFavorites.value,
    companyId: iamStore.currentCompanyId,
    compatibleTypes: onlyCompatible.value ? equipmentTypes.value : null,
  })
);

function productCount(providerId) { return catalogStore.productsForProvider(providerId).length; }
function minPrice(providerId) {
  const list = catalogStore.productsForProvider(providerId);
  return list.length ? Math.min(...list.map(p => p.pricePerLiter)) : 0;
}
function isCompatible(provider) {
  if (!onlyCompatible.value && equipmentTypes.value.length === 0) return true;
  return equipmentTypes.value.some(ft => provider.offers(ft));
}

function openProvider(provider) { router.push(`/catalog/providers/${provider.id}`); }
function onToggleFavorite(provider) { catalogStore.toggleFavorite(iamStore.currentCompanyId, provider.id); }

function onToggleCompare(provider) {
  const idx = compareList.value.findIndex(p => p.id === provider.id);
  if (idx !== -1) compareList.value.splice(idx, 1);
  else if (compareList.value.length < 3) compareList.value.push(provider);
}
function isComparing(providerId) { return compareList.value.some(p => p.id === providerId); }

const compareFuelRows = computed(() => {
  const set = new Set();
  compareList.value.forEach(p => p.fuelTypesOffered.forEach(ft => set.add(ft)));
  return [...set];
});
function priceFor(provider, ft) {
  const items = catalogStore.productsForProvider(provider.id).filter(p => p.fuelType === ft);
  return items.length ? Math.min(...items.map(p => p.pricePerLiter)) : null;
}
</script>

<template>
  <div class="catalog-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ t('catalog.title') }}</h1>
        <p class="page-subtitle">{{ t('catalog.subtitle') }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <pv-icon-field class="search">
        <pv-input-icon class="pi pi-search"/>
        <pv-input-text v-model="search" :placeholder="t('catalog.search-placeholder')"/>
      </pv-icon-field>
      <pv-select
          v-model="fuelType"
          :options="fuelOptions"
          option-label="label"
          option-value="code"
          class="filter-select"
      />
      <button class="chip-toggle" :class="{ active: onlyFavorites }" @click="onlyFavorites = !onlyFavorites">
        <i class="pi pi-star"/> {{ t('catalog.favorites') }}
      </button>
      <button
          v-if="equipmentTypes.length"
          class="chip-toggle"
          :class="{ active: onlyCompatible }"
          @click="onlyCompatible = !onlyCompatible"
      >
        <i class="pi pi-check-circle"/> {{ t('catalog.compatible') }}
      </button>
    </div>

    <div v-if="catalogStore.loading" class="state-msg">{{ t('common.loading') }}</div>

    <div v-else-if="providers.length === 0" class="empty-state">
      <i class="pi pi-search"/>
      <p>{{ t('catalog.no-providers') }}</p>
    </div>

    <div v-else class="provider-grid">
      <ProviderCard
          v-for="provider in providers"
          :key="provider.id"
          :provider="provider"
          :product-count="productCount(provider.id)"
          :min-price="minPrice(provider.id)"
          :favorite="catalogStore.isFavorite(iamStore.currentCompanyId, provider.id)"
          :compare-selected="isComparing(provider.id)"
          :compatible="isCompatible(provider)"
          @select="openProvider"
          @toggle-favorite="onToggleFavorite"
          @toggle-compare="onToggleCompare"
      />
    </div>

    <!-- Compare bar -->
    <transition name="slide-up">
      <div v-if="compareList.length" class="compare-bar">
        <span>{{ t('catalog.comparing', { n: compareList.length }) }}</span>
        <div class="compare-chips">
          <span v-for="p in compareList" :key="p.id" class="compare-chip">
            {{ p.name }} <i class="pi pi-times" @click="onToggleCompare(p)"/>
          </span>
        </div>
        <pv-button :label="t('catalog.compare-now')" icon="pi pi-table" size="small" @click="compareVisible = true"/>
      </div>
    </transition>

    <!-- Compare dialog -->
    <pv-dialog v-model:visible="compareVisible" modal :header="t('catalog.compare-providers')" :style="{ width: '640px' }">
      <table class="compare-table">
        <thead>
          <tr>
            <th>{{ t('catalog.fuel-type') }}</th>
            <th v-for="p in compareList" :key="p.id">{{ p.name }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="rlabel">{{ t('catalog.rating') }}</td>
            <td v-for="p in compareList" :key="p.id"><i class="pi pi-star-fill star"/> {{ p.rating }}</td>
          </tr>
          <tr v-for="ft in compareFuelRows" :key="ft">
            <td class="rlabel">{{ fuelTypeLabel(ft) }}</td>
            <td v-for="p in compareList" :key="p.id">
              <span v-if="priceFor(p, ft) !== null">S/ {{ priceFor(p, ft).toFixed(2) }}</span>
              <span v-else class="dash">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </pv-dialog>
  </div>
</template>

<style scoped>
.catalog-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 80px; }
.page-title { font-size: 26px; font-weight: 700; color: #1a2744; margin: 0; }
.page-subtitle { font-size: 14px; color: #8b9ab5; margin: 4px 0 0; }

.toolbar { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.search :deep(.p-inputtext) { width: 280px; }
.filter-select { min-width: 180px; }
.chip-toggle { border: 1px solid #e5e7eb; background: #fff; border-radius: 999px; padding: 8px 16px; cursor: pointer; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 6px; }
.chip-toggle.active { border-color: #2563eb; background: #eff6ff; color: #1e3a8a; }

.provider-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }

.state-msg { padding: 2rem; text-align: center; color: #8b9ab5; }
.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: .75rem; }

.compare-bar { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #1a2744; color: #fff; border-radius: 14px; padding: 14px 20px; display: flex; align-items: center; gap: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.3); z-index: 40; }
.compare-chips { display: flex; gap: 8px; }
.compare-chip { background: rgba(255,255,255,.12); border-radius: 8px; padding: 4px 10px; font-size: .82rem; display: flex; align-items: center; gap: 6px; }
.compare-chip i { cursor: pointer; }

.compare-table { width: 100%; border-collapse: collapse; }
.compare-table th, .compare-table td { padding: 10px; text-align: center; border-bottom: 1px solid #eef2f7; }
.compare-table th { background: #f1f5f9; font-size: .82rem; color: #475569; }
.rlabel { text-align: left !important; font-weight: 600; color: #1a2744; }
.star { color: #f59e0b; }
.dash { color: #cbd5e1; }

.slide-up-enter-active, .slide-up-leave-active { transition: all .25s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translate(-50%, 20px); }
</style>
