<script setup>
/**
 * Presentational invoice document. Receives an invoice via props and renders it.
 * It owns no state and reaches into no store — pure presentation.
 */
import { useI18n } from 'vue-i18n';
import { fuelTypeLabel } from '../../../shared/domain/fuel-types.js';

const { t } = useI18n();

defineProps({
  /** @type {import('vue').PropType<Object>} */
  invoice: { type: Object, required: true },
});

function money(value) {
  return `S/ ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
}
</script>

<template>
  <div class="invoice">
    <div class="invoice-head">
      <div class="invoice-brand">
        <img src="/fulltank-logo.png" alt="FullTank" class="invoice-logo"/>
        <div>
          <div class="invoice-provider">{{ invoice.providerName }}</div>
          <div class="invoice-ruc">RUC: {{ invoice.providerRuc }}</div>
        </div>
      </div>
      <div class="invoice-box">
        <div class="invoice-box-title">{{ t('payment.invoice') }}</div>
        <div class="invoice-number">{{ invoice.invoiceNumber }}</div>
        <pv-tag :value="t('payment.simulated-badge')" severity="warn" class="sim-badge"/>
      </div>
    </div>

    <div class="invoice-parties">
      <div>
        <span class="lbl">{{ t('payment.bill-to') }}</span>
        <div class="party-name">{{ invoice.buyerName }}</div>
        <div class="party-ruc">RUC: {{ invoice.buyerRuc }}</div>
      </div>
      <div class="text-right">
        <span class="lbl">{{ t('payment.issue-date') }}</span>
        <div>{{ formatDate(invoice.issueDate) }}</div>
        <span class="lbl mt">{{ t('payment.order-ref') }}</span>
        <div>#FT-{{ String(invoice.orderId).padStart(3, '0') }}</div>
      </div>
    </div>

    <table class="invoice-table">
      <thead>
        <tr>
          <th>{{ t('payment.col-description') }}</th>
          <th class="num">{{ t('payment.col-qty') }}</th>
          <th class="num">{{ t('payment.col-unit-price') }}</th>
          <th class="num">{{ t('payment.col-amount') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{{ fuelTypeLabel(invoice.fuelType) }}</td>
          <td class="num">{{ invoice.quantity }} {{ invoice.unit === 'LITERS' ? 'L' : 'gal' }}</td>
          <td class="num">{{ money(invoice.unitPrice) }}</td>
          <td class="num">{{ money(invoice.subtotal) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="invoice-totals">
      <div class="trow"><span>{{ t('payment.subtotal') }}</span><span>{{ money(invoice.subtotal) }}</span></div>
      <div class="trow"><span>{{ t('payment.igv') }}</span><span>{{ money(invoice.igv) }}</span></div>
      <div class="trow total"><span>{{ t('payment.total') }}</span><span>{{ money(invoice.total) }}</span></div>
    </div>

    <div class="invoice-footer">
      <div class="invoice-disclaimer">
        <i class="pi pi-info-circle"/> {{ t('payment.simulated-warning') }}
      </div>
      <div class="invoice-status">
        <pv-tag :value="invoice.status" severity="success"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invoice { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; font-family: 'Inter', sans-serif; }
.invoice-head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e3a8a; padding-bottom: 16px; }
.invoice-brand { display: flex; gap: 12px; align-items: center; }
.invoice-logo { height: 40px; }
.invoice-provider { font-weight: 700; color: #1a2744; font-size: 1rem; }
.invoice-ruc { font-size: .8rem; color: #64748b; }
.invoice-box { text-align: right; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 16px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.invoice-box-title { font-size: .7rem; letter-spacing: 1px; color: #64748b; text-transform: uppercase; }
.invoice-number { font-weight: 700; color: #1e3a8a; font-size: 1.05rem; }
.sim-badge { font-size: .65rem; padding: 1px 6px; }

.invoice-parties { display: flex; justify-content: space-between; margin: 20px 0; }
.lbl { font-size: .7rem; text-transform: uppercase; letter-spacing: .5px; color: #94a3b8; display: block; }
.lbl.mt { margin-top: 10px; }
.party-name { font-weight: 600; color: #1a2744; margin-top: 2px; }
.party-ruc { font-size: .82rem; color: #64748b; }
.text-right { text-align: right; }

.invoice-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
.invoice-table th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: .78rem; color: #475569; text-transform: uppercase; letter-spacing: .4px; }
.invoice-table td { padding: 12px; border-bottom: 1px solid #eef2f7; color: #1a2744; }
.invoice-table .num { text-align: right; }

.invoice-totals { margin-top: 16px; margin-left: auto; width: 260px; }
.trow { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
.trow.total { border-top: 2px solid #1e3a8a; margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 1.1rem; color: #1a2744; }

.invoice-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 12px; }
.invoice-disclaimer { font-size: .75rem; color: #94a3b8; display: flex; align-items: center; gap: 6px; }
.invoice-status { text-align: right; }
</style>
