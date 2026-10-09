import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import usePaymentStore from '../src/payment/application/payment.store.js';
import { PaymentAssembler, InvoiceAssembler } from '../src/payment/infrastructure/payment.assembler.js';

vi.mock('../src/payment/infrastructure/payment-api.js', () => {
  const MockPaymentApi = vi.fn();
  MockPaymentApi.prototype.getPayments = vi.fn().mockResolvedValue({ data: [] });
  MockPaymentApi.prototype.getInvoices = vi.fn().mockResolvedValue({ data: [] });
  MockPaymentApi.prototype.checkout = vi.fn();
  return { PaymentApi: MockPaymentApi };
});

/**
 * The payment page lists only the data of the signed-in buyer company.
 * These specs lock that filtering so a buyer can never see another
 * company's payments or invoices.
 */
describe('Payment store selectors', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  function seed(store) {
    store.payments = PaymentAssembler.toEntitiesFromResponse({
      status: 200,
      data: [
        { id: 1, orderId: 10, companyId: 100, amount: 500, status: 'COMPLETED' },
        { id: 2, orderId: 11, companyId: 100, amount: 300, status: 'PENDING' },
        { id: 3, orderId: 12, companyId: 200, amount: 800, status: 'COMPLETED' },
      ],
    });
    store.invoices = InvoiceAssembler.toEntitiesFromResponse({
      status: 200,
      data: [
        { id: 1, paymentId: 1, orderId: 10, invoiceNumber: 'F001-00000001', total: 500 },
        { id: 2, paymentId: 3, orderId: 12, invoiceNumber: 'F001-00000002', total: 800 },
      ],
    });
  }

  it('returns only the payments of the given buyer company', () => {
    const store = usePaymentStore();
    seed(store);

    const payments = store.paymentsForBuyer(100);

    expect(payments).toHaveLength(2);
    expect(payments.map(p => p.orderId)).toEqual([10, 11]);
  });

  it('returns only the invoices linked to the buyer payments', () => {
    const store = usePaymentStore();
    seed(store);

    const invoices = store.invoicesForBuyer(100);

    expect(invoices).toHaveLength(1);
    expect(invoices[0].invoiceNumber).toBe('F001-00000001');
  });

  it('ignores invoices whose payment belongs to another company', () => {
    const store = usePaymentStore();
    seed(store);

    expect(store.invoicesForBuyer(200).map(i => i.orderId)).toEqual([12]);
  });

  it('marks an order as paid only when its payment is completed', () => {
    const store = usePaymentStore();
    seed(store);

    expect(store.isOrderPaid(10)).toBe(true);
    expect(store.isOrderPaid(11)).toBe(false);
    expect(store.isOrderPaid(99)).toBe(false);
  });

  it('starts with no payments, no invoices and no errors', () => {
    const store = usePaymentStore();

    expect(store.payments).toEqual([]);
    expect(store.invoices).toEqual([]);
    expect(store.errors).toEqual([]);
    expect(store.loaded).toBe(false);
  });

  it('clears collected errors', () => {
    const store = usePaymentStore();
    store.errors.push(new Error('network'));

    store.clearErrors();

    expect(store.errors).toEqual([]);
  });
});
