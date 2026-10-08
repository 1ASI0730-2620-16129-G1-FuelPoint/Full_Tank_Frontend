<script setup>
/**
 * Equipment card (presentational child). Emits `edit`, `delete`,
 * `request-refill` and `toggle-auto`. Holds no store reference; the parent page
 * coordinates refill requests through the shared coordination service.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';

const { t } = useI18n();

const props = defineProps({
  equipment: { type: Object, required: true },
  providerName: { type: String, default: '' },
});
const emit = defineEmits(['edit', 'delete', 'request-refill', 'toggle-auto']);

const pct = computed(() => props.equipment.fillPercentage());
const statusKey = computed(() => props.equipment.status);
const statusColor = computed(() => ({
  operational: '#059669', low_fuel: '#f59e0b', critical: '#dc2626', maintenance: '#6366f1', inactive: '#94a3b8',
}[statusKey.value] ?? '#64748b'));
const barColor = computed(() => pct.value <= props.equipment.refillThreshold / 2 ? '#dc2626' : pct.value <= props.equipment.refillThreshold ? '#f59e0b' : '#2563eb');
</script>

<template>
  <div class="eq-card" :class="{ alert: equipment.needsRefill() }">
    <div class="eq-head">
      <div class="eq-icon"><i class="pi pi-cog"/></div>
      <div class="eq-title">
        <div class="eq-name">{{ equipment.name }}</div>
        <div class="eq-type">{{ equipment.type }}</div>
      </div>
      <span class="eq-status" :style="{ background: statusColor + '1a', color: statusColor }">
        {{ t('equipment.status-' + statusKey) }}
      </span>
    </div>

    <div class="eq-fuel">
      <span class="fuel-tag">{{ fuelTypeLabel(equipment.requiredFuelType) }}</span>
      <span v-if="providerName" class="prov"><i class="pi pi-star-fill"/> {{ providerName }}</span>
    </div>

    <div class="eq-level">
      <div class="level-top">
        <span>{{ t('equipment.fuel-level') }}</span>
        <span class="level-val">{{ equipment.currentLevel }} / {{ equipment.capacity }} {{ equipment.unit === 'LITERS' ? 'L' : 'gal' }}</span>
      </div>
      <div class="bar"><div class="bar-fill" :style="{ width: pct + '%', background: barColor }"/></div>
      <div class="level-pct">{{ pct }}%</div>
    </div>

    <div class="eq-meta">
      <span><i class="pi pi-map-marker"/> {{ equipment.location || '—' }}</span>
      <label class="auto-toggle" @click.stop>
        <input type="checkbox" :checked="equipment.autoRefill" @change="emit('toggle-auto', equipment)"/>
        {{ t('equipment.auto-refill') }}
      </label>
    </div>

    <div class="eq-actions">
      <pv-button
          :label="t('equipment.refill')"
          icon="pi pi-bolt"
          size="small"
          :severity="equipment.needsRefill() ? 'warn' : 'secondary'"
          :outlined="!equipment.needsRefill()"
          @click="emit('request-refill', equipment)"
      />
      <div class="icon-actions">
        <pv-button icon="pi pi-pencil" text rounded size="small" @click="emit('edit', equipment)"/>
        <pv-button icon="pi pi-trash" text rounded size="small" severity="danger" @click="emit('delete', equipment)"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.eq-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 12px; transition: box-shadow .15s; }
.eq-card:hover { box-shadow: 0 6px 18px rgba(0,0,0,.07); }
.eq-card.alert { border-color: #fcd34d; }
.eq-head { display: flex; align-items: center; gap: 12px; }
.eq-icon { width: 42px; height: 42px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
.eq-title { flex: 1; }
.eq-name { font-weight: 700; color: #1a2744; }
.eq-type { font-size: .8rem; color: #94a3b8; }
.eq-status { font-size: .72rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; text-transform: capitalize; }

.eq-fuel { display: flex; align-items: center; gap: 10px; }
.fuel-tag { background: #eef2f7; color: #475569; border-radius: 6px; padding: 2px 10px; font-size: .76rem; font-weight: 600; }
.prov { font-size: .76rem; color: #f59e0b; }

.eq-level { background: #f8fafc; border-radius: 10px; padding: 10px 12px; }
.level-top { display: flex; justify-content: space-between; font-size: .78rem; color: #64748b; }
.level-val { font-weight: 600; color: #1a2744; }
.bar { height: 8px; background: #e5e7eb; border-radius: 999px; margin: 6px 0 2px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; transition: width .3s; }
.level-pct { text-align: right; font-size: .72rem; font-weight: 700; color: #475569; }

.eq-meta { display: flex; justify-content: space-between; align-items: center; font-size: .8rem; color: #64748b; }
.auto-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; }

.eq-actions { display: flex; justify-content: space-between; align-items: center; }
.icon-actions { display: flex; gap: 2px; }
</style>
