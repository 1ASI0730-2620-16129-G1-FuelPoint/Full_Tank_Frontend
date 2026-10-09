import { registerFakeCollection } from '../../../shared/infrastructure/fake/fake-database.js';

/**
 * Demo seed for the Reporting bounded context.
 *
 * In the original frontend these figures were computed from the Ordering and
 * Equipment read models. Those bounded contexts are not integrated yet, so
 * Reporting registers a static demo snapshot of its own analytics endpoints
 * and recomputes them from real orders once Ordering lands.
 *
 * The shared fake API resolves `/analytics/buyer/1/spending-summary` as the
 * resource `spending-summary` of the collection `/analytics/buyer/1`, so each
 * report is registered as an item of its company collection.
 */
const analyticsPath = import.meta.env.VITE_ANALYTICS_ENDPOINT_PATH;

const DEMO_BUYER_ID = 1;
const DEMO_PROVIDER_ID = 101;

const buyerDashboard = [{
    id: DEMO_BUYER_ID,
    activeOrders: 3,
    pendingPayments: 1,
    needsRefill: 2,
    totalSpent: 17901,
    spendingTrend: [
        { label: 'May', amount: 4320 },
        { label: 'Jun', amount: 7776 },
        { label: 'Jul', amount: 0 },
        { label: 'Aug', amount: 5805 },
        { label: 'Sep', amount: 0 },
        { label: 'Oct', amount: 10125 },
    ],
}];

const providerDashboard = [{
    id: DEMO_PROVIDER_ID,
    pendingRequests: 4,
    ordersInTransit: 2,
    monthlyRevenue: 17901,
    lowStockAlerts: 1,
    salesTrend: [
        { label: 'May', amount: 4320 },
        { label: 'Jun', amount: 7776 },
        { label: 'Jul', amount: 0 },
        { label: 'Aug', amount: 5805 },
        { label: 'Sep', amount: 0 },
        { label: 'Oct', amount: 10125 },
    ],
}];

const buyerReports = [
    { id: 'spending-summary', totalSpent: 17901, totalOrders: 3, averageOrderValue: 5967 },
    {
        id: 'monthly-spending',
        series: [
            { label: 'May', amount: 4320 },
            { label: 'Jun', amount: 7776 },
            { label: 'Oct', amount: 10125 },
        ],
    },
    {
        id: 'spending-by-provider',
        series: [
            { provider: 'Petro Andes Distribuidora S.A.C.', amount: 13581 },
            { provider: 'Combustibles del Norte S.A.C.', amount: 4320 },
        ],
    },
    {
        id: 'spending-by-fuel-type',
        series: [
            { fuelType: 'DIESEL_B5', amount: 13581 },
            { fuelType: 'GASOLINE_90', amount: 4320 },
        ],
    },
    {
        id: 'spending-by-equipment',
        series: [
            { equipment: 'Excavator CAT 320', consumed: 750, amount: 10125 },
            { equipment: 'Site tank TK-01', consumed: 600, amount: 7776 },
        ],
    },
];

const providerReports = [
    { id: 'sales-summary', totalRevenue: 17901, totalOrders: 3, fulfillmentRate: 0.98, averageLeadTime: 4.2 },
    {
        id: 'revenue-over-time',
        series: [
            { label: 'May', amount: 4320 },
            { label: 'Jun', amount: 7776 },
            { label: 'Oct', amount: 10125 },
        ],
    },
    {
        id: 'revenue-by-fuel-type',
        series: [
            { fuelType: 'DIESEL_B5', amount: 13581 },
            { fuelType: 'GASOLINE_90', amount: 4320 },
        ],
    },
    {
        id: 'orders-by-status',
        series: [
            { status: 'COMPLETED', count: 3 },
            { status: 'IN_TRANSIT', count: 2 },
            { status: 'PENDING', count: 4 },
        ],
    },
    {
        id: 'customers-by-sector',
        series: [
            { sector: 'TRANSPORT', amount: 13581 },
            { sector: 'CONSTRUCTION', amount: 4320 },
        ],
    },
    {
        id: 'top-customers',
        series: [
            { company: 'Transportes del Sur S.A.', orders: 2, amount: 17901 },
            { company: 'Constructora Andina S.A.C.', orders: 1, amount: 4320 },
        ],
    },
];

let registered = false;

/** Registers the Reporting demo collections once per application start. */
export function registerAnalyticsDemoData() {
    if (registered) return;
    registerFakeCollection(`${analyticsPath}/buyer-dashboard`, buyerDashboard);
    registerFakeCollection(`${analyticsPath}/provider-dashboard`, providerDashboard);
    registerFakeCollection(`${analyticsPath}/buyer/${DEMO_BUYER_ID}`, buyerReports);
    registerFakeCollection(`${analyticsPath}/provider/${DEMO_PROVIDER_ID}`, providerReports);
    registered = true;
}

export { DEMO_BUYER_ID, DEMO_PROVIDER_ID };
