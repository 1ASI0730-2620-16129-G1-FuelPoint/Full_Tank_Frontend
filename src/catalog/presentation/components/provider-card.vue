<script setup>
/**
 * Provider card (presentational child). Emits `select`, `toggle-favorite` and
 * `toggle-compare`. Reaches into no store.
 */
import { useI18n } from 'vue-i18n';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';

const { t } = useI18n();

defineProps({
  provider: { type: Object, required: true },
  productCount: { type: Number, default: 0 },
  minPrice: { type: Number, default: 0 },
  favorite: { type: Boolean, default: false },
  compareSelected: { type: Boolean, default: false },
  compatible: { type: Boolean, default: true },
});
const emit = defineEmits(['select', 'toggle-favorite', 'toggle-compare']);
</script>

<template>
  <div class="provider-card" :class="{ incompatible: !compatible }">
    <div class="pc-top">
      <div class="pc-avatar">{{ provider.name.charAt(0) }}</div>
      <button
          class="fav-btn"
          :class="{ active: favorite }"
          @click.stop="emit('toggle-favorite', provider)"
          :title="t('catalog.favorite')"
      >
        <i :class="favorite ? 'pi pi-star-fill' : 'pi pi-star'"/>
      </button>
    </div>

    <h3 class="pc-name">{{ provider.name }}</h3>
    <div class="pc-rating">
      <i class="pi pi-star-fill"/> {{ provider.rating }}
      <span class="rating-count">({{ provider.ratingsCount }})</span>
      <span class="pc-ruc">· RUC {{ provider.ruc }}</span>
    </div>
    <p class="pc-desc">{{ provider.description }}</p>

    <div class="pc-fuels">
      <span v-for="ft in provider.fuelTypesOffered" :key="ft" class="fuel-chip">{{ fuelTypeLabel(ft) }}</span>
    </div>

    <div class="pc-stats">
      <div><span class="stat-num">{{ productCount }}</span><span class="stat-lbl">{{ t('catalog.products') }}</span></div>
      <div><span class="stat-num">S/ {{ minPrice.toFixed(2) }}</span><span class="stat-lbl">{{ t('catalog.from') }}</span></div>
    </div>

    <span v-if="!compatible" class="incompatible-badge">
      <i class="pi pi-exclamation-triangle"/> {{ t('catalog.not-compatible') }}
    </span>

    <div class="pc-actions">
      <label class="compare-check" @click.stop>
        <input type="checkbox" :checked="compareSelected" @change="emit('toggle-compare', provider)"/>
        {{ t('catalog.compare') }}
      </label>
      <pv-button :label="t('catalog.view')" icon="pi pi-arrow-right" icon-pos="right" size="small" @click="emit('select', provider)"/>
    </div>
  </div>
</template>

<style scoped>
.provider-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 8px; transition: box-shadow .15s, transform .1s; }
.provider-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.08); transform: translateY(-2px); }
.provider-card.incompatible { opacity: .7; }
.pc-top { display: flex; justify-content: space-between; align-items: flex-start; }
.pc-avatar { width: 46px; height: 46px; border-radius: 12px; background: #1e3a8a; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; }
.fav-btn { border: none; background: transparent; cursor: pointer; font-size: 1.2rem; color: #cbd5e1; }
.fav-btn.active { color: #f59e0b; }
.pc-name { margin: 4px 0 0; font-size: 1.05rem; color: #1a2744; }
.pc-rating { font-size: .82rem; color: #f59e0b; font-weight: 600; }
.rating-count { color: #94a3b8; font-weight: 400; }
.pc-ruc { color: #94a3b8; font-weight: 400; }
.pc-desc { margin: 4px 0; font-size: .82rem; color: #64748b; line-height: 1.4; min-height: 34px; }
.pc-fuels { display: flex; flex-wrap: wrap; gap: 6px; }
.fuel-chip { background: #eff6ff; color: #1e3a8a; border-radius: 6px; padding: 2px 8px; font-size: .72rem; font-weight: 600; }
.pc-stats { display: flex; gap: 24px; margin: 10px 0; padding: 10px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; }
.pc-stats > div { display: flex; flex-direction: column; }
.stat-num { font-weight: 700; color: #1a2744; }
.stat-lbl { font-size: .72rem; color: #94a3b8; text-transform: uppercase; }
.incompatible-badge { font-size: .75rem; color: #b45309; background: #fef3c7; padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; }
.pc-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; }
.compare-check { font-size: .8rem; color: #64748b; display: flex; align-items: center; gap: 6px; cursor: pointer; }
</style>
