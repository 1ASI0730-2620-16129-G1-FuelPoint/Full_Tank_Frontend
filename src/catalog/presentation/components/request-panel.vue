<script setup>
/**
 * Fuel request panel (presentational child) used in the provider detail page.
 * Receives the provider's stock-aware products and the buyer's equipment via
 * props, performs client-side validation (compatibility, provider stock and
 * equipment remaining capacity), and emits `create-request`. It never touches
 * the Ordering store — the parent page calls the coordination service.
 */
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';
import { toLiters, unitSuffix, formatDate as fmtDate } from '../../../shared/domain/helpers.js';

const { t, locale } = useI18n();

const props = defineProps({
  products: { type: Array, default: () => [] },
  equipmentList: { type: Array, default: () => [] },
  defaultAddress: { type: String, default: '' },
  providerName: { type: String, default: '' },
});
const emit = defineEmits(['create-request']);

const selectedProductId = ref(null);
const selectedEquipmentId = ref(null);
const quantity = ref(0);
const submitted = ref(false);

// Delivery details. In B2B fuel the drop-off point and date are operational, so
// they are editable. Address defaults to the company's registered address; date
// defaults to three days out and cannot be set in the past.
const today = new Date();
const minDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
const minDateStr = minDate.toISOString().slice(0, 10);
const deliveryAddress = ref(props.defaultAddress);
const deliveryDate = ref(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));

watch(() => props.defaultAddress, (addr) => {
  if (!deliveryAddress.value && addr) deliveryAddress.value = addr;
});

const addressValid = computed(() => deliveryAddress.value.trim().length > 0);
const dateValid = computed(() => !!deliveryDate.value && deliveryDate.value >= minDateStr);

// Only products with valid price and stock available can be requested.
const availableProducts = computed(() =>
  props.products.filter(p => p.available && p.stock > 0 && Number(p.pricePerLiter) > 0)
);

const selectedProduct = computed(() => props.products.find(p => p.id === selectedProductId.value) ?? null);
const selectedEquipment = computed(() => props.equipmentList.find(e => e.id === selectedEquipmentId.value) ?? null);

const validPrice = computed(() => !!selectedProduct.value && Number(selectedProduct.value.pricePerLiter) > 0);

// Compatibility: the equipment's required fuel type must match the product fuel type.
const compatible = computed(() => {
  if (!selectedProduct.value || !selectedEquipment.value) return true;
  return selectedProduct.value.fuelType === selectedEquipment.value.requiredFuelType;
});

// Available stock from provider inventory, in the product's unit.
const availableStock = computed(() => selectedProduct.value?.stock ?? 0);

// Fuel the selected equipment still needs, expressed in the product's unit.
const equipmentNeed = computed(() => {
  if (!selectedProduct.value || !selectedEquipment.value) return null;
  const neededLiters = toLiters(selectedEquipment.value.remainingCapacity(), selectedEquipment.value.unit);
  // express in product unit
  return selectedProduct.value.unit === 'GALLONS' ? neededLiters / 3.78541 : neededLiters;
});

const requestedLiters = computed(() => selectedProduct.value ? toLiters(quantity.value, selectedProduct.value.unit) : 0);
const stockLiters = computed(() => selectedProduct.value ? toLiters(availableStock.value, selectedProduct.value.unit) : 0);

const exceedsStock = computed(() => requestedLiters.value > stockLiters.value + 0.001);
const exceedsEquipment = computed(() =>
  equipmentNeed.value !== null && requestedLiters.value > toLiters(equipmentNeed.value, selectedProduct.value.unit) + 0.001
);

const canSubmit = computed(() =>
  !!selectedProduct.value &&
  validPrice.value &&
  Number(quantity.value) > 0 &&
  compatible.value &&
  !exceedsStock.value &&
  !exceedsEquipment.value &&
  addressValid.value &&
  dateValid.value
);

// When equipment is chosen, suggest a compatible product, default quantity to its
// need and use the equipment's own location as the delivery address (fuel goes to
// where the equipment is, not necessarily the company's registered address).
watch(selectedEquipmentId, () => {
  if (!selectedEquipment.value) return;
  const match = availableProducts.value.find(p => p.fuelType === selectedEquipment.value.requiredFuelType);
  if (match) selectedProductId.value = match.id;
  if (selectedEquipment.value.location) deliveryAddress.value = selectedEquipment.value.location;
});

// Default quantity to a sensible value when product/equipment changes.
watch([selectedProductId, selectedEquipmentId], () => {
  if (!selectedProduct.value) return;
  const need = equipmentNeed.value;
  const cap = need !== null ? Math.min(need, availableStock.value) : availableStock.value;
  quantity.value = Math.max(1, Math.floor(cap || 1));
});
</script>

<template>
  <div class="panel">
    <h3 class="panel-title">{{ t('catalog.create-request') }}</h3>

    <div class="field">
      <label>{{ t('catalog.select-product') }}</label>
      <pv-select
          v-model="selectedProductId"
          :options="availableProducts"
          option-label="name"
          option-value="id"
          :placeholder="t('catalog.select-product')"
          class="w-full"
      >
        <template #option="{ option }">
          <div class="opt">
            <span>{{ option.name }}</span>
            <span class="opt-price">S/ {{ option.pricePerLiter.toFixed(2) }} · {{ t('catalog.stock') }}: {{ option.stock.toLocaleString() }} {{ unitSuffix(option.unit) }}</span>
          </div>
        </template>
      </pv-select>
      <small v-if="!availableProducts.length" class="muted">{{ t('catalog.no-stock-products') }}</small>
    </div>

    <div class="field">
      <label>{{ t('catalog.select-equipment') }}</label>
      <pv-select
          v-model="selectedEquipmentId"
          :options="equipmentList"
          option-label="name"
          option-value="id"
          :placeholder="t('catalog.select-equipment-optional')"
          show-clear
          class="w-full"
      >
        <template #option="{ option }">
          <div class="opt">
            <span>{{ option.name }}</span>
            <span class="opt-price">{{ fuelTypeLabel(option.requiredFuelType) }} · {{ t('catalog.needs') }} {{ Math.round(option.remainingCapacity()) }} {{ unitSuffix(option.unit) }}</span>
          </div>
        </template>
      </pv-select>
    </div>

    <div class="field">
      <label>{{ t('catalog.quantity') }} ({{ selectedProduct ? unitSuffix(selectedProduct.unit) : '—' }})</label>
      <pv-input-number v-model="quantity" :min="0" :max="100000" class="w-full"/>
      <div v-if="selectedProduct" class="limits">
        <span><i class="pi pi-database"/> {{ t('catalog.stock') }}: {{ availableStock.toLocaleString() }} {{ unitSuffix(selectedProduct.unit) }}</span>
        <span v-if="equipmentNeed !== null"><i class="pi pi-cog"/> {{ t('catalog.needs') }}: {{ Math.round(equipmentNeed) }} {{ unitSuffix(selectedProduct.unit) }}</span>
      </div>
    </div>

    <div class="field">
      <label><i class="pi pi-map-marker lbl-icon"/> {{ t('catalog.delivery-address') }}</label>
      <pv-input-text v-model="deliveryAddress" class="w-full" :invalid="submitted && !addressValid"/>
      <small v-if="submitted && !addressValid" class="err">{{ t('catalog.address-required') }}</small>
    </div>

    <div class="field">
      <label><i class="pi pi-calendar lbl-icon"/> {{ t('catalog.delivery-date') }}</label>
      <pv-input-text v-model="deliveryDate" type="date" :min="minDateStr" class="w-full" :invalid="submitted && !dateValid"/>
      <small v-if="submitted && !dateValid" class="err">{{ t('catalog.date-required') }}</small>
    </div>

    <!-- Validation alerts -->
    <pv-message v-if="selectedProduct && !validPrice" severity="error" :closable="false" class="mt">
      {{ t('catalog.invalid-product-price') }}
    </pv-message>
    <pv-message v-else-if="selectedEquipment && !compatible" severity="warn" :closable="false" class="mt">
      {{ t('catalog.incompatible-alert', {
        equipment: selectedEquipment.name,
        required: fuelTypeLabel(selectedEquipment.requiredFuelType),
        product: fuelTypeLabel(selectedProduct?.fuelType)
      }) }}
    </pv-message>
    <pv-message v-else-if="exceedsStock" severity="error" :closable="false" class="mt">
      {{ t('catalog.exceeds-stock', { stock: availableStock.toLocaleString(), unit: unitSuffix(selectedProduct.unit) }) }}
    </pv-message>
    <pv-message v-else-if="exceedsEquipment" severity="error" :closable="false" class="mt">
      {{ t('catalog.exceeds-equipment', { need: Math.round(equipmentNeed), unit: unitSuffix(selectedProduct.unit) }) }}
    </pv-message>

    <!-- One-glance summary before submitting -->
    <div v-if="selectedProduct" class="summary">
      <div class="sum-title">{{ t('catalog.summary-title') }}</div>
      <div v-if="providerName" class="sum-row"><span>{{ t('catalog.summary-provider') }}</span><span class="sum-val">{{ providerName }}</span></div>
      <div class="sum-row"><span>{{ t('catalog.summary-product') }}</span><span class="sum-val">{{ selectedProduct.name }}</span></div>
      <div class="sum-row"><span>{{ t('catalog.summary-equipment') }}</span><span class="sum-val">{{ selectedEquipment ? selectedEquipment.name : t('catalog.summary-none') }}</span></div>
      <div class="sum-row"><span>{{ t('catalog.quantity') }}</span><span class="sum-val">{{ Number(quantity || 0).toLocaleString() }} {{ unitSuffix(selectedProduct.unit) }}</span></div>
      <div class="sum-row"><span>{{ t('catalog.delivery-address') }}</span><span class="sum-val ellipsis" :title="deliveryAddress">{{ deliveryAddress || t('catalog.summary-none') }}</span></div>
      <div class="sum-row"><span>{{ t('catalog.delivery-date') }}</span><span class="sum-val">{{ deliveryDate ? fmtDate(deliveryDate, locale) : t('catalog.summary-none') }}</span></div>
      <div class="sum-total">
        <span>{{ t('catalog.estimated-total') }}</span>
        <strong>S/ {{ (selectedProduct.pricePerLiter * Number(quantity || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 }) }}</strong>
      </div>
    </div>

    <pv-button
        :label="t('catalog.send-request')"
        icon="pi pi-send"
        class="submit-btn"
        :disabled="!canSubmit"
        @click="submitted = true; canSubmit && emit('create-request', { product: selectedProduct, equipmentId: selectedEquipmentId, quantity: Number(quantity), unit: selectedProduct.unit, deliveryAddress: deliveryAddress.trim(), deliveryDate })"
    />
  </div>
</template>

<style scoped>
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; position: sticky; top: 80px; }
.panel-title { margin: 0 0 16px; font-size: 1.05rem; color: #1a2744; }
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.field label { font-size: .8rem; font-weight: 600; color: #475569; }
.lbl-icon { font-size: .72rem; margin-right: 4px; color: #94a3b8; }
.err { color: #dc2626; font-size: .74rem; }
.w-full { width: 100%; }
.w-full :deep(.p-inputnumber), .w-full :deep(.p-inputnumber-input) { width: 100%; }
.opt { display: flex; flex-direction: column; }
.opt-price { font-size: .75rem; color: #94a3b8; }
.muted { color: #94a3b8; font-size: .78rem; }
.limits { display: flex; gap: 14px; font-size: .76rem; color: #64748b; margin-top: 2px; }
.limits i { font-size: .7rem; margin-right: 3px; }
.mt { margin-bottom: 14px; }
.summary { background: #f1f5f9; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
.sum-title { font-size: .74rem; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #64748b; margin-bottom: 8px; }
.sum-row { display: flex; justify-content: space-between; gap: 12px; font-size: .8rem; padding: 3px 0; }
.sum-row > span:first-child { color: #94a3b8; flex-shrink: 0; }
.sum-val { color: #1a2744; font-weight: 600; text-align: right; }
.sum-val.ellipsis { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sum-total { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 10px; }
.sum-total span { font-size: .82rem; color: #475569; font-weight: 600; }
.sum-total strong { font-size: 1.2rem; color: #1a2744; }
.submit-btn { width: 100%; justify-content: center; }
</style>
