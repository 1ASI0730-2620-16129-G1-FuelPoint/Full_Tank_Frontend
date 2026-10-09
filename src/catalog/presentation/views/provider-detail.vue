<script setup>
/**
 * Provider detail page (buyer). Route-level coordinator: shows a provider's
 * products and a request panel. When the panel emits `create-request`, this page
 * calls the shared coordination service to create the request in Ordering and
 * notify both parties. The panel/components never touch the Ordering store.
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import useCatalogStore from '../../application/catalog.store.js';
import useIamStore from '../../../iam/application/iam.store.js';
import { submitFuelRequest, listCompanyEquipment } from '../../../shared/application/coordination.service.js';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import RequestPanel from '../components/request-panel.vue';
import pinia from '../../../pinia.js';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const catalogStore = useCatalogStore(pinia);
const iamStore = useIamStore(pinia);

const equipmentList = ref([]);
const hoveredRating = ref(0);
const savingRating = ref(false);

onMounted(async () => {
  if (!catalogStore.loaded || String(catalogStore.loadedCompanyId) !== String(iamStore.currentCompanyId)) {
    await catalogStore.fetchCatalog(iamStore.currentCompanyId);
  }
  if (!iamStore.buyerCompanies.length) iamStore.fetchDirectories();
  equipmentList.value = await listCompanyEquipment(iamStore.currentCompanyId);
});

const provider = computed(() => catalogStore.getProviderById(route.params.id));
const products = computed(() => provider.value ? catalogStore.productsForProvider(provider.value.id) : []);
const buyerAddress = computed(() => iamStore.buyerCompanies.find(c => c.id === iamStore.currentCompanyId)?.address ?? '');
const isFavorite = computed(() => provider.value && catalogStore.isFavorite(iamStore.currentCompanyId, provider.value.id));
const currentRating = computed(() => provider.value
  ? catalogStore.ratingForBuyer(iamStore.currentCompanyId, provider.value.id)
  : 0);
const displayedRating = computed(() => hoveredRating.value || currentRating.value);

function toggleFavorite() {
  if (provider.value) catalogStore.toggleFavorite(iamStore.currentCompanyId, provider.value.id);
}

async function selectRating(value) {
  if (!provider.value || savingRating.value) return;
  savingRating.value = true;
  const saved = await catalogStore.rateProvider(
    iamStore.currentCompanyId,
    provider.value.id,
    value,
  );
  savingRating.value = false;
  if (saved) {
    toast.add({ severity: 'success', summary: t('catalog.rating-saved'), life: 2500 });
  }
}

async function onCreateRequest(payload) {
  const unitPrice = Number(payload?.product?.pricePerLiter);
  if (!unitPrice || unitPrice <= 0 || !Number.isFinite(unitPrice)) {
    toast.add({ severity: 'error', summary: t('common.error'), detail: t('catalog.invalid-product-price'), life: 4000 });
    return;
  }

  const buyer = iamStore.buyerCompanies.find(c => c.id === iamStore.currentCompanyId);
  const request = await submitFuelRequest({
    companyId: iamStore.currentCompanyId,
    providerId: provider.value.id,
    equipmentId: payload.equipmentId,
    fuelType: payload.product.fuelType,
    productName: payload.product.name,
    quantity: payload.quantity,
    unit: payload.unit,
    unitPrice,
    deliveryAddress: payload.deliveryAddress || buyer?.address || '',
    deliveryDate: payload.deliveryDate,
    source: 'MANUAL',
  });

  if (request) {
    toast.add({ severity: 'success', summary: t('catalog.request-sent'), detail: t('catalog.request-sent-detail', { provider: provider.value.name }), life: 4000 });
    // Natural next step after submitting is to track the request, not stay in the
    // catalog. The global toast persists across the route change. Only navigate on
    // success; on error we stay so the buyer can retry without losing the form.
    // `created=1` triggers a persistent success banner on the destination.
    router.push({ path: '/ordering/my-requests', query: { created: '1' } });
  } else {
    toast.add({ severity: 'error', summary: t('common.error'), life: 4000 });
  }
}

function money(v) { return `S/ ${Number(v).toFixed(2)}`; }
</script>

<template>
  <div v-if="provider" class="detail-page">
    <button class="back-btn" @click="router.push('/catalog')">
      <i class="pi pi-arrow-left"/> {{ t('catalog.back') }}
    </button>

    <div class="detail-grid">
      <!-- Left: provider + products -->
      <div class="detail-main">
        <div class="provider-header">
          <div class="ph-avatar">{{ provider.name.charAt(0) }}</div>
          <div class="ph-info">
            <div class="ph-top">
              <h1>{{ provider.name }}</h1>
              <button class="fav-btn" :class="{ active: isFavorite }" @click="toggleFavorite">
                <i :class="isFavorite ? 'pi pi-star-fill' : 'pi pi-star'"/>
              </button>
            </div>
            <div class="ph-meta">
              <span>
                <i class="pi pi-star-fill star"/> {{ provider.rating }}
                · {{ t('catalog.ratings-count', provider.ratingsCount) }}
              </span>
              <span><i class="pi pi-id-card"/> RUC {{ provider.ruc }}</span>
              <span><i class="pi pi-map-marker"/> {{ provider.address }}</span>
            </div>
            <p class="ph-desc">{{ provider.description }}</p>
            <div class="rating-box">
              <span class="rating-label">
                {{ currentRating ? t('catalog.your-rating') : t('catalog.rate-provider') }}
              </span>
              <div class="rating-stars" @mouseleave="hoveredRating = 0">
                <button
                    v-for="star in 5"
                    type="button"
                    class="rating-star"
                    :class="{ active: star <= displayedRating }"
                    :aria-label="t('catalog.select-rating', star)"
                    :disabled="savingRating"
                    @mouseenter="hoveredRating = star"
                    @focus="hoveredRating = star"
                    @blur="hoveredRating = 0"
                    @click="selectRating(star)"
                >
                  <i :class="star <= displayedRating ? 'pi pi-star-fill' : 'pi pi-star'"/>
                </button>
              </div>
            </div>
          </div>
        </div>

        <h3 class="section-title">{{ t('catalog.products-offered') }}</h3>
        <div class="product-list">
          <div v-for="product in products" :key="product.id" class="product-row" :class="{ unavailable: !product.available }">
            <div class="prod-icon"><i class="pi pi-bolt"/></div>
            <div class="prod-info">
              <div class="prod-name">{{ product.name }}</div>
              <div class="prod-fuel">{{ fuelTypeLabel(product.fuelType) }} · {{ product.description }}</div>
              <div class="prod-stock">
                <i class="pi pi-database"/>
                {{ t('catalog.stock') }}: {{ product.stock.toLocaleString() }} {{ product.unit === 'LITERS' ? 'L' : 'gal' }}
              </div>
            </div>
            <div class="prod-right">
              <div class="prod-price">{{ money(product.pricePerLiter) }}<span class="per">/{{ product.unit === 'LITERS' ? 'L' : 'gal' }}</span></div>
              <pv-tag
                  :value="product.available ? t('catalog.available') : t('catalog.unavailable')"
                  :severity="product.available ? 'success' : 'danger'"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Right: request panel (child emits create-request) -->
      <div class="detail-side">
        <RequestPanel
            :products="products"
            :equipment-list="equipmentList"
            :default-address="buyerAddress"
            :provider-name="provider?.name ?? ''"
            @create-request="onCreateRequest"
        />
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    <i class="pi pi-exclamation-circle"/>
    <p>{{ t('catalog.provider-not-found') }}</p>
    <pv-button :label="t('catalog.back')" text @click="router.push('/catalog')"/>
  </div>
</template>

<style scoped>
.detail-page { display: flex; flex-direction: column; gap: 18px; }
.back-btn { align-self: flex-start; border: none; background: transparent; color: #64748b; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.back-btn:hover { color: #1e3a8a; }

.detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }

.provider-header { display: flex; gap: 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 22px; }
.ph-avatar { width: 64px; height: 64px; border-radius: 16px; background: #1e3a8a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 700; flex-shrink: 0; }
.ph-info { flex: 1; }
.ph-top { display: flex; justify-content: space-between; align-items: center; }
.ph-top h1 { margin: 0; font-size: 1.5rem; color: #1a2744; }
.fav-btn { border: none; background: transparent; cursor: pointer; font-size: 1.4rem; color: #cbd5e1; }
.fav-btn.active { color: #f59e0b; }
.ph-meta { display: flex; gap: 18px; flex-wrap: wrap; margin: 8px 0; font-size: .85rem; color: #64748b; }
.ph-meta .star { color: #f59e0b; }
.ph-desc { color: #475569; line-height: 1.5; margin: 6px 0 0; }
.rating-box { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.rating-label { font-size: .82rem; font-weight: 600; color: #475569; }
.rating-stars { display: flex; gap: 2px; }
.rating-star { border: 0; background: transparent; color: #cbd5e1; padding: 2px; cursor: pointer; font-size: 1.2rem; }
.rating-star.active { color: #f59e0b; }
.rating-star:disabled { cursor: wait; opacity: .65; }

.section-title { margin: 8px 0 0; font-size: 1.1rem; color: #1a2744; }
.product-list { display: flex; flex-direction: column; gap: 10px; }
.product-row { display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 18px; }
.product-row.unavailable { opacity: .6; }
.prod-icon { width: 40px; height: 40px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; }
.prod-info { flex: 1; }
.prod-name { font-weight: 600; color: #1a2744; }
.prod-fuel { font-size: .82rem; color: #64748b; }
.prod-stock { font-size: .76rem; color: #2563eb; margin-top: 3px; }
.prod-stock i { font-size: .7rem; margin-right: 3px; }
.prod-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.prod-price { font-weight: 700; color: #1a2744; font-size: 1.1rem; }
.per { font-size: .8rem; color: #94a3b8; font-weight: 400; }

.empty-state { padding: 4rem 2rem; text-align: center; color: #94a3b8; }
.empty-state i { font-size: 2.5rem; display: block; margin-bottom: .75rem; }

@media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } }
</style>
