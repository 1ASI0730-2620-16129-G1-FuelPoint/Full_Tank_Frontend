import { beforeEach, describe, expect, it } from 'vitest';
import pinia from '../../src/pinia.js';
import useIamStore from '../../src/iam/application/iam.store.js';
import useCatalogStore from '../../src/catalog/application/catalog.store.js';
import useOrderingStore from '../../src/ordering/application/ordering.store.js';
import useNotificationStore from '../../src/notification/application/notification.store.js';
import usePaymentStore from '../../src/payment/application/payment.store.js';
import { IamApi } from '../../src/iam/infrastructure/iam-api.js';
import { OrderingApi } from '../../src/ordering/infrastructure/ordering-api.js';
import { InventoryApi } from '../../src/inventory/infrastructure/inventory-api.js';
import { FulfillmentApi } from '../../src/fulfillment/infrastructure/fulfillment-api.js';
import { AnalyticsApi } from '../../src/reporting/infrastructure/analytics-api.js';
import { EquipmentApi } from '../../src/equipment/infrastructure/equipment-api.js';
import { submitFuelRequest, acceptRequest, assignDelivery, confirmOrderReception, completePayment } from '../../src/shared/application/coordination.service.js';

// Opt-in suite: runs against a real, disposable Development database.
// It creates requests, orders, payments and companies; never target production.
const buyerEmail = 'logistics@transportesdelsur.com';
const providerEmail = 'dispatch@petroandes.com';
const iamApi = new IamApi();
const orderingApi = new OrderingApi();
const inventoryApi = new InventoryApi();
const fulfillmentApi = new FulfillmentApi();
const analyticsApi = new AnalyticsApi();
const iam = () => useIamStore(pinia);
const notifications = () => useNotificationStore(pinia);

function expectNoErrors(store) {
    expect(store.errors.map(e => ({ status: e.response?.status, data: e.response?.data, message: e.message }))).toEqual([]);
}

beforeEach(() => {
    for (const store of pinia._s.values()) store.$dispose();
    pinia._s.clear();
    pinia.state.value = {};
});

describe('real .NET backend integration', () => {
    it('uses HTTP, rejects invalid credentials and protects private endpoints', async () => {
        expect(import.meta.env.VITE_USE_FAKE_API).toBe('false');
        await expect(iamApi.signIn(buyerEmail, 'incorrect')).rejects.toMatchObject({ response: { status: 401 } });
        await expect(orderingApi.getOrders()).rejects.toMatchObject({ response: { status: 401 } });
        await iam().login(buyerEmail, '123456');
        expect(iam().session.token.split('.')).toHaveLength(3);
        expect(iam().isBuyer).toBe(true);
        expect(iam().currentCompany.name).toBe(iam().session.name);
        expect((await iamApi.getUserById(iam().currentUserId)).data).not.toHaveProperty('password');
        expect((await iam().fetchCurrentUser()).id).toBe(iam().currentUserId);
    });

    it.each(['http://127.0.0.1:5173', 'http://localhost:5173'])('permits browser CORS from %s', async origin => {
        const response = await fetch(`${import.meta.env.VITE_FULLTANK_API_URL}/authentication/sign-in`, {
            method: 'OPTIONS',
            headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' },
        });
        expect(response.status).toBe(204);
        expect(response.headers.get('access-control-allow-origin')).toBe(origin);
        expect(response.headers.get('access-control-allow-headers')).toContain('authorization');
    });

    it('loads buyer catalog, equipment, favorites, ratings, reports and notifications', async () => {
        await iam().login(buyerEmail, '123456');
        const id = iam().currentCompanyId;
        const catalog = useCatalogStore(pinia);
        await catalog.fetchCatalog(id);
        expectNoErrors(catalog);
        expect(catalog.providers.length).toBeGreaterThan(0);
        expect(catalog.products.some(p => p.available && p.pricePerLiter > 0)).toBe(true);
        expect(catalog.products.find(p => p.fuelType === 'DIESEL').unit).toBe('LITERS');
        const providerId = catalog.providers[0].id;
        const wasFavorite = catalog.isFavorite(id, providerId);
        await catalog.toggleFavorite(id, providerId);
        expectNoErrors(catalog);
        expect(catalog.isFavorite(id, providerId)).toBe(!wasFavorite);
        await catalog.toggleFavorite(id, providerId);
        expectNoErrors(catalog);
        expect(catalog.isFavorite(id, providerId)).toBe(wasFavorite);
        expect(await catalog.rateProvider(id, providerId, 4)).not.toBeNull();
        expectNoErrors(catalog);
        expect((await new EquipmentApi().getEquipment()).data).toBeInstanceOf(Array);
        await notifications().fetchNotifications();
        expectNoErrors(notifications());
        expect((await analyticsApi.getBuyerDashboard(id)).status).toBe(200);
        for (const response of await analyticsApi.getBuyerReport(id, { year: new Date().getFullYear() })) expect(response.status).toBe(200);
    });

    it('persists the buyer request, provider approval, dispatch, receipt and simulated payment', async () => {
        await iam().login(buyerEmail, '123456');
        const buyer = { ...iam().currentCompany };
        const catalog = useCatalogStore(pinia);
        await catalog.fetchCatalog(buyer.id);
        expectNoErrors(catalog);
        await iam().login(providerEmail, '123456');
        const provider = { ...iam().currentCompany };
        const product = catalog.products.find(p => p.providerId === provider.id && p.available && p.stock > 10);
        expect(product).toBeDefined();
        await iam().login(buyerEmail, '123456');
        const request = await submitFuelRequest({
            companyId: buyer.id, providerId: provider.id, equipmentId: null,
            fuelType: product.fuelType, productName: product.name,
            quantity: 10, unit: product.unit, unitPrice: product.pricePerLiter,
            deliveryAddress: buyer.address, deliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
            source: 'MANUAL', status: 'PENDING',
        });
        expectNoErrors(useOrderingStore(pinia));
        expect(request).not.toBeNull();
        expectNoErrors(notifications());
        expect(request.status).toBe('PENDING');
        expect((await orderingApi.getRequestById(request.id)).data.id).toBe(request.id);
        await expect(orderingApi.approveFuelRequest(request.id)).rejects.toMatchObject({ response: { status: 403 } });

        await iam().login(providerEmail, '123456');
        expect((await orderingApi.getRequests()).data.some(r => r.id === request.id)).toBe(true);
        const before = (await inventoryApi.getProducts()).data.find(p => p.id === product.id);
        const approved = await acceptRequest(request);
        expectNoErrors(useOrderingStore(pinia));
        expect(approved.ok).toBe(true);
        expect(approved.order.status).toBe('ACCEPTED');
        const reserved = (await inventoryApi.getProducts()).data.find(p => p.id === product.id);
        expect(reserved.reserved).toBe(before.reserved + 10);
        const drivers = (await fulfillmentApi.getDrivers(provider.id)).data;
        const vehicles = (await fulfillmentApi.getVehicles(provider.id)).data;
        const driver = drivers.find(d => d.status === 'AVAILABLE');
        const vehicle = vehicles.find(v => v.status === 'AVAILABLE' && v.capacity >= 10);
        expect(driver).toBeDefined(); expect(vehicle).toBeDefined();
        const dispatched = await assignDelivery({ order: approved.order, driverId: driver.id, vehicleId: vehicle.id });
        expectNoErrors(useOrderingStore(pinia));
        expect(dispatched.ok).toBe(true);
        expect(dispatched.order.status).toBe('DISPATCHED');
        const after = (await inventoryApi.getProducts()).data.find(p => p.id === product.id);
        expect(after.stock).toBe(before.stock - 10);
        expect(after.reserved).toBe(before.reserved);

        await iam().login(buyerEmail, '123456');
        const received = await confirmOrderReception({ order: dispatched.order });
        expectNoErrors(useOrderingStore(pinia));
        expect(received.ok).toBe(true);
        expect(received.order.status).toBe('PENDING_PAYMENT');
        const result = await completePayment({ order: received.order, method: 'CARD', card: { number: '4111111111111111', holder: 'Integration Test' }, buyer, provider });
        expectNoErrors(usePaymentStore(pinia));
        expect(result).not.toBeNull();
        expect(result.payment.status).toBe('COMPLETED');
        expect(result.invoice.invoiceNumber).toBeTruthy();
        expectNoErrors(notifications());
        const persisted = (await orderingApi.getOrderById(received.order.id)).data;
        expect(persisted.paymentStatus).toBe('PAID');
        await usePaymentStore(pinia).fetchInvoices();
        expectNoErrors(usePaymentStore(pinia));
        expect(usePaymentStore(pinia).invoices.some(i => i.id === result.invoice.id)).toBe(true);
    });

    it('loads provider inventory, fleet, reports and role restrictions', async () => {
        await iam().login(providerEmail, '123456');
        const id = iam().currentProviderId;
        expect((await inventoryApi.getProducts()).data.length).toBeGreaterThan(0);
        expect((await fulfillmentApi.getDrivers(id)).data.length).toBeGreaterThan(0);
        expect((await fulfillmentApi.getVehicles(id)).data.length).toBeGreaterThan(0);
        expect((await fulfillmentApi.getDeliveries()).data).toBeInstanceOf(Array);
        expect((await analyticsApi.getProviderDashboard(id)).status).toBe(200);
        for (const response of await analyticsApi.getProviderReport(id, { year: new Date().getFullYear() })) expect(response.status).toBe(200);
        await expect(analyticsApi.getBuyerDashboard(1)).rejects.toMatchObject({ response: { status: 403 } });
    });

    it.each(['BUYER', 'PROVIDER'])('registers a new %s through the real company and account endpoints', async role => {
        const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const email = `integration-${role.toLowerCase()}-${suffix}@example.test`;
        await iam().register({ role, companyName: `Integration ${role} ${suffix}`, ruc: `20${suffix.slice(-9)}`, address: 'Lima, Peru', phone: '999888777', sector: 'TRANSPORT', email, password: 'Integration123!' });
        expect(iam().isAuthenticated).toBe(true);
        expect(iam().email).toBe(email);
        expect(iam().role).toBe(role);
        expect(iam().currentCompany.id).toBe(iam().session.companyId);
    });
});
