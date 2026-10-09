<script setup>
/**
 * Payment form dialog (presentational child).
 * Receives the order to pay via props and emits `pay` with the chosen method
 * and (fake) card/Yape data. It does NOT touch any store: the parent page calls
 * the coordination service in response to the emitted event.
 */
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  visible: { type: Boolean, default: false },
  order: { type: Object, default: null },
});
const emit = defineEmits(['pay', 'cancel', 'update:visible']);

const method = ref('CARD');
const card = ref({ number: '', holder: '', expiry: '', cvv: '' });
const yape = ref({ phone: '', code: '' });
const submitted = ref(false);

watch(() => props.visible, (open) => {
  if (open) {
    method.value = 'CARD';
    card.value = { number: '', holder: '', expiry: '', cvv: '' };
    yape.value = { phone: '', code: '' };
    submitted.value = false;
  }
});

const cardValid = computed(() =>
  card.value.number.replace(/\s/g, '').length >= 15 &&
  card.value.holder.trim().length > 0 &&
  /^\d{2}\/\d{2}$/.test(card.value.expiry) &&
  /^\d{3,4}$/.test(card.value.cvv)
);
const yapeValid = computed(() =>
  /^\d{9}$/.test(yape.value.phone) && /^\d{6}$/.test(yape.value.code)
);
const isValid = computed(() => method.value === 'CARD' ? cardValid.value : yapeValid.value);

function money(value) {
  return `S/ ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function close() {
  emit('update:visible', false);
  emit('cancel');
}

function confirm() {
  submitted.value = true;
  if (!isValid.value) return;
  emit('pay', {
    method: method.value,
    card: method.value === 'CARD'
      ? { number: card.value.number.replace(/\s/g, ''), holder: card.value.holder }
      : { phone: yape.value.phone },
  });
}
</script>

<template>
  <pv-dialog
      :visible="visible"
      modal
      :header="`${t('payment.pay-order')} — ${t('payment.simulated-badge')}`"
      :style="{ width: '480px' }"
      @update:visible="emit('update:visible', $event)"
  >
    <pv-message severity="warn" :closable="false" class="mb-3">
      {{ t('payment.simulated-warning') }}
    </pv-message>

    <div v-if="order" class="pay-amount">
      <span>{{ t('payment.amount-due') }}</span>
      <strong>{{ money(order.totalAmount) }}</strong>
    </div>

    <div class="method-tabs">
      <button class="method-tab" :class="{ active: method === 'CARD' }" @click="method = 'CARD'">
        <i class="pi pi-credit-card"/> {{ t('payment.method-card') }}
      </button>
      <button class="method-tab" :class="{ active: method === 'YAPE' }" @click="method = 'YAPE'">
        <i class="pi pi-mobile"/> {{ t('payment.method-yape') }}
      </button>
    </div>

    <!-- Card form -->
    <div v-if="method === 'CARD'" class="form-grid">
      <div class="field span-2">
        <label>{{ t('payment.card-number') }}</label>
        <pv-input-text v-model="card.number" placeholder="4242 4242 4242 4242" maxlength="19"/>
        <small v-if="submitted && card.number.replace(/\s/g,'').length < 15" class="err">{{ t('payment.invalid-card') }}</small>
      </div>
      <div class="field span-2">
        <label>{{ t('payment.card-holder') }}</label>
        <pv-input-text v-model="card.holder" placeholder="JOHN DOE"/>
      </div>
      <div class="field">
        <label>{{ t('payment.card-expiry') }}</label>
        <pv-input-text v-model="card.expiry" placeholder="MM/YY" maxlength="5"/>
      </div>
      <div class="field">
        <label>{{ t('payment.card-cvv') }}</label>
        <pv-input-text v-model="card.cvv" placeholder="123" maxlength="4"/>
      </div>
    </div>

    <!-- Yape form -->
    <div v-else class="form-grid">
      <div class="field span-2">
        <label>{{ t('payment.yape-phone') }}</label>
        <pv-input-text v-model="yape.phone" placeholder="999888777" maxlength="9"/>
        <small v-if="submitted && !/^\d{9}$/.test(yape.phone)" class="err">{{ t('payment.invalid-phone') }}</small>
      </div>
      <div class="field span-2">
        <label>{{ t('payment.yape-code') }}</label>
        <pv-input-text v-model="yape.code" placeholder="123456" maxlength="6"/>
      </div>
    </div>

    <p class="demo-note"><i class="pi pi-info-circle"/> {{ t('payment.demo-note') }}</p>

    <template #footer>
      <pv-button :label="t('common.cancel')" text @click="close"/>
      <pv-button :label="t('payment.confirm-pay')" icon="pi pi-lock" :disabled="!isValid" @click="confirm"/>
    </template>
  </pv-dialog>
</template>

<style scoped>
.mb-3 { margin-bottom: 14px; }
.pay-amount { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; border-radius: 10px; padding: 14px 18px; margin-bottom: 18px; }
.pay-amount strong { font-size: 1.4rem; color: #1a2744; }

.method-tabs { display: flex; gap: 10px; margin-bottom: 18px; }
.method-tab { flex: 1; border: 2px solid #e5e7eb; background: #fff; border-radius: 10px; padding: 12px; cursor: pointer; font-weight: 600; color: #475569; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all .15s; }
.method-tab.active { border-color: #2563eb; background: #eff6ff; color: #1e3a8a; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.span-2 { grid-column: span 2; }
.field label { font-size: .8rem; font-weight: 600; color: #475569; }
.field :deep(.p-inputtext) { width: 100%; }
.err { color: #dc2626; font-size: .75rem; }

.demo-note { margin-top: 16px; font-size: .78rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
</style>
