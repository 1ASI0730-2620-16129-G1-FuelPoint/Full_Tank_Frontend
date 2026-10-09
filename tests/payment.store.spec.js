import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import usePaymentStore from '../src/payment/application/payment.store.js';
import { PaymentApi } from '../src/payment/infrastructure/payment-api.js';

vi.mock('../src/payment/infrastructure/payment-api.js', () => {
  const MockPaymentApi = vi.fn();
  MockPaymentApi.prototype.getPayments = vi.fn().mockResolvedValue({ data: [] });
  MockPaymentApi.prototype.getInvoices = vi.fn().mockResolvedValue({ data: [] });
  MockPaymentApi.prototype.checkout = vi.fn();
  return { PaymentApi: MockPaymentApi };
});

describe('Payment Store Real Invoicing & Simulation Disclosures', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('payOrder', () => {
    it('relies on server-generated invoice breakdown and does not generate client F001 or TXN numbers', async () => {
      const store = usePaymentStore();

      const serverPaymentResource = {
        id: 50,
        orderId: 10,
        amount: 1500,
        reference: 'TXN-2026-00050',
        status: 'COMPLETED',
      };
      const serverInvoiceResource = {
        id: 75,
        paymentId: 50,
        orderId: 10,
        invoiceNumber: 'INV-2026-00075',
        subtotal: 1271.19,
        igv: 228.81,
        total: 1500,
        status: 'ISSUED',
      };

      PaymentApi.prototype.checkout.mockResolvedValue({
        data: {
          payment: serverPaymentResource,
          invoice: serverInvoiceResource,
        },
      });

      const orderFixture = {
        id: 10,
        companyId: 1,
        providerId: 2,
        totalAmount: 1500,
        fuelType: 'DIESEL_B5',
        quantity: 500,
        unit: 'GALLONS',
        unitPrice: 2.54,
      };

      const result = await store.payOrder({
        order: orderFixture,
        method: 'CARD',
        card: { number: '4111111111111234', holder: 'Mining Corp' },
        buyer: { id: 1, name: 'Mining Corp', ruc: '20123456789' },
        provider: { id: 2, name: 'PetroSupply', ruc: '20987654321' },
      });

      expect(result).not.toBeNull();
      expect(result.payment.id).toBe(50);
      expect(result.payment.reference).toBe('TXN-2026-00050');
      expect(result.invoice.id).toBe(75);
      expect(result.invoice.invoiceNumber).toBe('INV-2026-00075');

      expect(store.payments.some(p => p.id === 50)).toBe(true);
      expect(store.invoices.some(i => i.id === 75)).toBe(true);

      // Draft payloads sent to server must have blank reference/invoiceNumber (no synthetic client counters)
      expect(PaymentApi.prototype.checkout).toHaveBeenCalledTimes(1);
      const [paymentDraft, invoiceDraft] = PaymentApi.prototype.checkout.mock.calls[0];
      expect(paymentDraft.reference).toBe('');
      expect(invoiceDraft.invoiceNumber).toBe('');
      expect(invoiceDraft.invoiceNumber).not.toContain('F001');
    });

    it('returns null and records error on checkout failure', async () => {
      const store = usePaymentStore();

      PaymentApi.prototype.checkout.mockRejectedValue(new Error('Gateway timeout'));

      const result = await store.payOrder({
        order: { id: 10, totalAmount: 500 },
        method: 'YAPE',
        card: { phone: '987654321' },
        buyer: { id: 1 },
        provider: { id: 2 },
      });

      expect(result).toBeNull();
      expect(store.errors.length).toBe(1);
      expect(store.errors[0].message).toBe('Gateway timeout');
    });
  });

  describe('isOrderPaid', () => {
    it('correctly detects paid orders from persisted server payments with COMPLETED status', () => {
      const store = usePaymentStore();
      store.payments = [
        { id: 1, orderId: 10, status: 'COMPLETED' },
        { id: 2, orderId: 20, status: 'FAILED' },
        { id: 3, orderId: 25, status: 'PENDING' },
      ];

      expect(store.isOrderPaid(10)).toBe(true);
      expect(store.isOrderPaid(20)).toBe(false);
      expect(store.isOrderPaid(25)).toBe(false);
      expect(store.isOrderPaid(99)).toBe(false);
    });
  });
});
