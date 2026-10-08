import { registerFakeCollection } from '../../../shared/infrastructure/fake/fake-database.js';

/**
 * Demo seed for the Payment bounded context.
 *
 * The shared fake API only serves collections that each bounded context
 * registers, so Payment publishes its own payments and invoices here.
 * Every value is simulated: no real card data and no fiscal document.
 */
const payments = [
    {
        id: 1,
        orderId: 5,
        companyId: 1,
        providerId: 101,
        method: 'CARD',
        amount: 10125,
        status: 'COMPLETED',
        maskedCard: '**** **** **** 4242',
        cardHolder: 'TRANSPORTES DEL SUR SA',
        reference: 'TXN-20241223-0001',
        createdAt: '2024-12-23T09:00:00Z',
    },
    {
        id: 2,
        orderId: 7,
        companyId: 1,
        providerId: 101,
        method: 'CARD',
        amount: 7776,
        status: 'COMPLETED',
        maskedCard: '**** **** **** 2948',
        cardHolder: 'TRANSPORTES DEL SUR SA',
        reference: 'TXN-20260601-0002',
        createdAt: '2026-06-01T02:51:03.987Z',
    },
    {
        id: 3,
        orderId: 8,
        companyId: 2,
        providerId: 102,
        method: 'YAPE',
        amount: 4320,
        status: 'COMPLETED',
        maskedCard: '',
        cardHolder: '924151626',
        reference: 'TXN-20260601-0003',
        createdAt: '2026-06-01T13:14:57.689Z',
    },
];

const invoices = [
    {
        id: 1,
        paymentId: 1,
        orderId: 5,
        invoiceNumber: 'F001-00000125',
        providerRuc: '20512345671',
        providerName: 'Petro Andes Distribuidora S.A.C.',
        buyerRuc: '20100111222',
        buyerName: 'Transportes del Sur S.A.',
        fuelType: 'GASOLINE_90',
        quantity: 750,
        unit: 'GALLONS',
        unitPrice: 13.5,
        subtotal: 8581.36,
        igv: 1543.64,
        total: 10125,
        issueDate: '2024-12-23T09:00:00Z',
        status: 'PAID',
    },
    {
        id: 2,
        paymentId: 2,
        orderId: 7,
        invoiceNumber: 'F001-00000126',
        providerRuc: '20512345671',
        providerName: 'Petro Andes Distribuidora S.A.C.',
        buyerRuc: '20100111222',
        buyerName: 'Transportes del Sur S.A.',
        fuelType: 'DIESEL_B5',
        quantity: 600,
        unit: 'GALLONS',
        unitPrice: 12.96,
        subtotal: 6589.83,
        igv: 1186.17,
        total: 7776,
        issueDate: '2026-06-01T02:51:03.987Z',
        status: 'PAID',
    },
];

let registered = false;

/** Registers the Payment demo collections once per application start. */
export function registerPaymentDemoData() {
    if (registered) return;
    registerFakeCollection(import.meta.env.VITE_PAYMENTS_ENDPOINT_PATH, payments);
    registerFakeCollection(import.meta.env.VITE_INVOICES_ENDPOINT_PATH, invoices);
    registered = true;
}

export { payments as paymentSeed, invoices as invoiceSeed };
