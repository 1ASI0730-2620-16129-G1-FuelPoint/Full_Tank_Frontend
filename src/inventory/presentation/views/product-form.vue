<script setup>
/**
 * Inventory tank create/edit form (provider). Captures stock, capacity and
 * status so tanks feed the buyer Catalog correctly. New tanks are bound to the
 * active provider.
 */
import { useRoute, useRouter } from "vue-router";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "primevue/usetoast";
import useInventoryStore from "../../application/inventory.store.js";
import useIamStore from "../../../iam/application/iam.store.js";
import { Product } from "../../domain/model/product.entity.js";
import { FUEL_TYPES, MEASUREMENT_UNITS } from "../../../shared/domain/fuel-types.js";
import pinia from "../../../pinia.js";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const toast = useToast();
const store = useInventoryStore(pinia);
const iamStore = useIamStore(pinia);

const isEdit = computed(() => !!route.params.id);
const submitted = ref(false);

const statusOptions = [
  { label: t('inventory.status-active'), value: 'ACTIVE' },
  { label: t('inventory.status-disabled'), value: 'DISABLED' },
];

const form = ref({
  id: null,
  providerId: null,
  name: '',
  type: 'DIESEL_B5',
  description: '',
  pricePerLiter: 0,
  stock: 0,
  capacity: 10000,
  lowStockThreshold: 2000,
  unit: 'LITERS',
  status: 'ACTIVE',
});

onMounted(async () => {
  if (!store.productsLoaded) await store.fetchProducts();
  if (isEdit.value) {
    const product = store.getProductById(route.params.id);
    if (product) form.value = { ...product };
  }
});

const valid = computed(() =>
  form.value.name.trim().length > 0 &&
  !!form.value.type &&
  Number(form.value.capacity) > 0 &&
  Number(form.value.stock) >= 0 &&
  Number(form.value.stock) <= Number(form.value.capacity)
);

const navigateBack = () => router.push({ name: 'inventory-products' });

async function saveProduct() {
  submitted.value = true;
  if (!valid.value) return;

  const product = new Product({
    ...form.value,
    id: isEdit.value ? route.params.id : null,
    providerId: form.value.providerId ?? iamStore.currentProviderId,
    pricePerLiter: Number(form.value.pricePerLiter),
    stock: Number(form.value.stock),
    capacity: Number(form.value.capacity),
    lowStockThreshold: Number(form.value.lowStockThreshold),
  });

  if (isEdit.value) {
    const updated = await store.updateProduct(product);
    if (!updated) return;
    toast.add({ severity: 'success', summary: t('inventory.updated'), life: 3000 });
  } else {
    const created = await store.addProduct(product);
    if (!created) return;
    toast.add({ severity: 'success', summary: t('inventory.created'), life: 3000 });
  }
  navigateBack();
}
</script>

<template>
  <div class="form-page">
    <button class="back-btn" @click="navigateBack"><i class="pi pi-arrow-left"/> {{ t('inventory.products') }}</button>

    <pv-card class="form-card">
      <template #content>
        <h2 class="form-title">{{ isEdit ? t('inventory.product-form.title-edit') : t('inventory.product-form.title-create') }}</h2>
        <p class="form-sub">{{ isEdit ? t('inventory.product-form.subtitle-edit') : t('inventory.product-form.subtitle-create') }}</p>

        <div class="grid">
          <div class="field span-2">
            <label>{{ t('inventory.product-form.field-name') }}</label>
            <pv-input-text v-model="form.name" :placeholder="t('inventory.product-form.field-name')"/>
            <small v-if="submitted && !form.name.trim()" class="err">{{ t('inventory.required') }}</small>
          </div>

          <div class="field">
            <label>{{ t('inventory.product-form.field-fuel') }}</label>
            <pv-select v-model="form.type" :options="FUEL_TYPES" option-label="label" option-value="code" class="w-full"/>
          </div>
          <div class="field">
            <label>{{ t('inventory.product-form.field-unit') }}</label>
            <pv-select v-model="form.unit" :options="MEASUREMENT_UNITS" option-label="label" option-value="code" class="w-full"/>
          </div>

          <div class="field">
            <label>{{ t('inventory.product-form.field-price') }}</label>
            <pv-input-number v-model="form.pricePerLiter" :min="0" :min-fraction-digits="2" :max-fraction-digits="2" class="w-full"/>
          </div>
          <div class="field">
            <label>{{ t('inventory.field-status') }}</label>
            <pv-select v-model="form.status" :options="statusOptions" option-label="label" option-value="value" class="w-full"/>
          </div>

          <div class="field">
            <label>{{ t('inventory.field-stock') }}</label>
            <pv-input-number v-model="form.stock" :min="0" class="w-full"/>
            <small v-if="submitted && Number(form.stock) > Number(form.capacity)" class="err">{{ t('inventory.stock-error') }}</small>
          </div>
          <div class="field">
            <label>{{ t('inventory.field-capacity') }}</label>
            <pv-input-number v-model="form.capacity" :min="1" class="w-full"/>
          </div>

          <div class="field">
            <label>{{ t('inventory.field-threshold') }}</label>
            <pv-input-number v-model="form.lowStockThreshold" :min="0" class="w-full"/>
          </div>
          <div class="field"></div>

          <div class="field span-2">
            <label>{{ t('inventory.product-form.field-desc') }}</label>
            <pv-textarea v-model="form.description" rows="2" class="w-full"/>
          </div>
        </div>

        <div class="form-actions">
          <pv-button :label="t('inventory.product-form.cancel')" text @click="navigateBack"/>
          <pv-button :label="isEdit ? t('inventory.product-form.update') : t('inventory.product-form.save')" icon="pi pi-check" :disabled="!valid" @click="saveProduct"/>
        </div>
      </template>
    </pv-card>
  </div>
</template>

<style scoped>
.form-page { display: flex; flex-direction: column; gap: 16px; max-width: 760px; }
.back-btn { align-self: flex-start; border: none; background: transparent; color: #64748b; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.back-btn:hover { color: #1e3a8a; }
.form-card { border-radius: 14px; }
.form-title { margin: 0; font-size: 1.4rem; color: #1a2744; }
.form-sub { margin: 4px 0 20px; color: #8b9ab5; font-size: .9rem; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.span-2 { grid-column: span 2; }
.field label { font-size: .82rem; font-weight: 600; color: #475569; }
.w-full { width: 100%; }
.w-full :deep(.p-inputnumber), .w-full :deep(.p-inputnumber-input) { width: 100%; }
.err { color: #dc2626; font-size: .75rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
</style>
