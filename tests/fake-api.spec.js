import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Integration contract for the demo fake API (`VITE_USE_FAKE_API=true`).
 * Drives the REAL infrastructure adapters (no mocks) through the in-memory
 * axios adapter to catch unhandled routes or broken response shapes before
 * deploying the demo build to Firebase Hosting.
 */

const ENDPOINTS = {
  VITE_FULLTANK_API_URL: '/api/v1',
  VITE_USE_FAKE_API: 'true',
  VITE_INVENTORY_ENDPOINT_PATH: '/inventory-items',
  VITE_INVENTORY_MOVEMENTS_ENDPOINT_PATH: '/inventory-movements',
  VITE_PROVIDER_PRODUCTS_ENDPOINT_PATH: '/provider-products',
  VITE_REQUESTS_ENDPOINT_PATH: '/fuel-requests',
  VITE_ORDERS_ENDPOINT_PATH: '/orders',
  VITE_VEHICLES_ENDPOINT_PATH: '/vehicles',
  VITE_DRIVERS_ENDPOINT_PATH: '/drivers',
  VITE_DELIVERIES_ENDPOINT_PATH: '/deliveries',
  VITE_EQUIPMENT_ENDPOINT_PATH: '/equipment',
  VITE_FAVORITE_PROVIDERS_ENDPOINT_PATH: '/favorite-providers',
  VITE_PROVIDER_RATINGS_ENDPOINT_PATH: '/provider-ratings',
  VITE_REFILL_HISTORY_ENDPOINT_PATH: '/refill-history',
  VITE_PAYMENTS_ENDPOINT_PATH: '/payments',
  VITE_INVOICES_ENDPOINT_PATH: '/invoices',
  VITE_PAYMENT_CHECKOUT_ENDPOINT_PATH: '/payment-checkout',
  VITE_NOTIFICATIONS_ENDPOINT_PATH: '/notifications',
  VITE_USERS_ENDPOINT_PATH: '/users',
  VITE_AUTHENTICATION_ENDPOINT_PATH: '/authentication',
  VITE_BUYER_COMPANIES_ENDPOINT_PATH: '/buyer-companies',
  VITE_PROVIDER_COMPANIES_ENDPOINT_PATH: '/provider-companies',
  VITE_ANALYTICS_ENDPOINT_PATH: '/analytics',
};

let IamApi;
let OrderingApi;
let AnalyticsApi;
let PaymentApi;
let NotificationApi;
let FulfillmentApi;
let InventoryApi;
let EquipmentApi;
let CatalogApi;

beforeEach(async () => {
  vi.resetModules();
  for (const [key, value] of Object.entries(ENDPOINTS)) {
    vi.stubEnv(key, value);
  }
  ({ IamApi } = await import('../src/iam/infrastructure/iam-api.js'));
  ({ OrderingApi } = await import('../src/ordering/infrastructure/ordering-api.js'));
  ({ AnalyticsApi } = await import('../src/reporting/infrastructure/analytics-api.js'));
  ({ PaymentApi } = await import('../src/payment/infrastructure/payment-api.js'));
  ({ NotificationApi } = await import('../src/notification/infrastructure/notification-api.js'));
  ({ FulfillmentApi } = await import('../src/fulfillment/infrastructure/fulfillment-api.js'));
  ({ InventoryApi } = await import('../src/inventory/infrastructure/inventory-api.js'));
  ({ EquipmentApi } = await import('../src/equipment/infrastructure/equipment-api.js'));
  ({ CatalogApi } = await import('../src/catalog/infrastructure/catalog-api.js'));
});

describe('fake API auth', () => {
  it('signs in the demo buyer and resolves its company', async () => {
    const api = new IamApi();
    const { data: user } = await api.signIn('logistics@transportesdelsur.com', '123456');
    expect(user.role).toBe('BUYER');
    expect(user.token).toMatch(/^fake-jwt-/);
    expect(user.companyId).toBe(1);
    const { data: company } = await api.getBuyerCompanyById(user.companyId);
    expect(company.name).toContain('Transportes del Sur');
  });

  it('signs in the demo provider and resolves its company', async () => {
    const api = new IamApi();
    const { data: user } = await api.signIn('dispatch@petroandes.com', '123456');
    expect(user.role).toBe('PROVIDER');
    const { data: company } = await api.getProviderCompanyById(user.companyId);
    expect(company.name).toContain('Petro Andes');
  });

  it('rejects wrong credentials with 401', async () => {
    const api = new IamApi();
    await expect(api.signIn('logistics@transportesdelsur.com', 'wrong'))
      .rejects.toMatchObject({ response: { status: 401 } });
    await expect(api.signIn('nobody@example.com', '123456'))
      .rejects.toMatchObject({ response: { status: 401 } });
  });

  it('registers a company + user and logs in afterwards', async () => {
    const api = new IamApi();
    const { data: company } = await api.createBuyerCompany({
      name: 'Demo Buyer', ruc: '20000000001', sector: 'TRANSPORT',
      address: 'Av. Demo 123', contactEmail: 'demo-buyer@example.com', phone: '999000111',
    });
    expect(company.id).toBeDefined();
    await api.signUp({
      name: 'Demo Buyer', email: 'demo-buyer@example.com', password: '123456',
      role: 'BUYER', companyId: company.id, username: 'demo-buyer@example.com', registrationToken: '',
    });
    const { data: user } = await api.signIn('demo-buyer@example.com', '123456');
    expect(user.companyId).toBe(company.id);
  });

  it('supports profile update and password change', async () => {
    const api = new IamApi();
    const { data: updated } = await api.updateUserProfile(1, { name: ' renamed', email: 'logistics@transportesdelsur.com' });
    expect(updated.name).toBe(' renamed');
    expect(updated.password).toBeUndefined();
    await api.changePassword(1, { currentPassword: '123456', newPassword: '654321' });
    const { data: user } = await api.signIn('logistics@transportesdelsur.com', '654321');
    expect(user.id).toBe(1);
    await expect(api.changePassword(1, { currentPassword: 'nope', newPassword: 'x' }))
      .rejects.toMatchObject({ response: { status: 401 } });
  });
});

describe('fake API ordering lifecycle', () => {
  it('approves a pending request and produces an order', async () => {
    const api = new OrderingApi();
    const { data: requests } = await api.getRequests();
    expect(Array.isArray(requests)).toBe(true);
    const pending = requests.find(r => r.status === 'PENDING');
    expect(pending).toBeDefined();
    const { data: order } = await api.approveFuelRequest(pending.id);
    expect(order.requestId).toBe(pending.id);
    expect(order.status).toBe('CREATED');
    expect(order.totalAmount).toBe(Number(pending.quantity) * Number(pending.unitPrice));
  });

  it('dispatches, receives and cancels orders', async () => {
    const api = new OrderingApi();
    const { data: created } = await api.createOrder({
      companyId: 1, providerId: 101, fuelType: 'DIESEL_B5', quantity: 100,
      unit: 'GALLONS', unitPrice: 16, totalAmount: 1600,
      deliveryAddress: 'Demo address', status: 'CREATED', paymentStatus: 'PENDING',
    });
    const { data: dispatched } = await api.dispatchOrder(created.id, { driverId: 1, vehicleId: 1 });
    expect(dispatched.status).toBe('DISPATCHED');
    expect(dispatched.driverId).toBe(1);
    const { data: received } = await api.receiveOrder(created.id);
    expect(received.status).toBe('DELIVERED');
    const { data: cancelled } = await api.cancelOrder(created.id, 'demo reason');
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancelReason).toBe('demo reason');
  });
});

describe('fake API fulfillment / inventory / equipment / catalog', () => {
  it('serves provider vehicles and drivers', async () => {
    const api = new FulfillmentApi();
    const { data: vehicles } = await api.getVehicles(101);
    expect(vehicles.length).toBeGreaterThan(0);
    expect(vehicles[0]).toMatchObject({ plate: expect.any(String) });
    const { data: drivers } = await api.getDrivers(101);
    expect(drivers[0]).toMatchObject({ licenseNumber: expect.any(String) });
  });

  it('completes a delivery', async () => {
    const api = new FulfillmentApi();
    const { data: deliveries } = await api.getDeliveries();
    const open = deliveries.find(d => d.status !== 'delivered');
    expect(open).toBeDefined();
    const response = await api.http.post(`/deliveries/${open.id}/complete`);
    expect(response.data.status).toBe('delivered');
  });

  it('serves inventory, movements, equipment and refill history', async () => {
    const inventory = new InventoryApi();
    const { data: items } = await inventory.getProducts();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ name: expect.any(String), pricePerLiter: expect.any(Number) });
    const { data: movements } = await inventory.getMovements();
    expect(Array.isArray(movements)).toBe(true);

    const equipment = new EquipmentApi();
    const { data: assets } = await equipment.getEquipment();
    expect(assets[0]).toMatchObject({ name: expect.any(String), currentLevel: expect.any(Number) });
    const created = await equipment.createEquipment({ companyId: 1, name: 'Demo tank', capacity: 100, currentLevel: 50 });
    expect(created.data.id).toBeDefined();
  });

  it('serves catalog providers, favorites and ratings', async () => {
    const catalog = new CatalogApi();
    const providers = await catalog.getProviders();
    expect(providers.data.length).toBeGreaterThan(0);
    const favorites = await catalog.getFavorites(1);
    expect(Array.isArray(favorites.data)).toBe(true);
    const ratings = await catalog.getRatings();
    expect(Array.isArray(ratings.data)).toBe(true);
  });
});

describe('fake API payment checkout', () => {
  it('creates payment + invoice and returns both', async () => {
    const api = new PaymentApi();
    const { data } = await api.checkout(
      { orderId: 5, companyId: 1, providerId: 101, method: 'CARD', amount: 10125 },
      { orderId: 5, invoiceNumber: 'F001-TEST', total: 10125 },
    );
    expect(data.payment.status).toBe('COMPLETED');
    expect(data.invoice.status).toBe('PAID');
    expect(data.invoice.paymentId).toBe(data.payment.id);
    const { data: payments } = await api.getPayments();
    expect(payments.some(p => p.id === data.payment.id)).toBe(true);
  });
});

describe('fake API notifications', () => {
  it('lists, reads and marks all as read', async () => {
    const api = new NotificationApi();
    const { data: all } = await api.getNotifications();
    expect(all.length).toBeGreaterThan(0);
    const unread = all.find(n => !n.read && n.companyId === 1);
    if (unread) {
      await api.updateNotification({ id: unread.id });
      const { data: reloaded } = await api.getNotifications();
      expect(reloaded.find(n => n.id === unread.id).read).toBe(true);
    }
    await api.markAllAsRead('BUYER', 1);
    const { data: after } = await api.getNotifications();
    expect(after.filter(n => String(n.companyId) === '1' && !n.read)).toHaveLength(0);
    await api.markAllAsRead('PROVIDER', 101);
  });
});

describe('fake API analytics', () => {
  it('serves buyer + provider dashboards', async () => {
    const api = new AnalyticsApi();
    const { data: buyer } = await api.getBuyerDashboard(1);
    expect(buyer).toMatchObject({
      activeOrders: expect.any(Number),
      pendingPayments: expect.any(Number),
      needsRefill: expect.any(Number),
      totalSpent: expect.any(Number),
    });
    expect(Array.isArray(buyer.spendingTrend)).toBe(true);
    expect(buyer.spendingTrend[0]).toMatchObject({ label: expect.any(String), amount: expect.any(Number) });
    const { data: provider } = await api.getProviderDashboard(101);
    expect(provider).toMatchObject({
      activeOrders: expect.any(Number),
      pendingRequests: expect.any(Number),
    });
  });

  it('serves the full buyer report', async () => {
    const api = new AnalyticsApi();
    const [summary, trend, byProvider, byFuel, byEquipment] = await api.getBuyerReport(1, {});
    expect(summary.data).toMatchObject({
      totalSpent: expect.any(Number),
      totalOrders: expect.any(Number),
      averageOrderValue: expect.any(Number),
    });
    expect(trend.data[0]).toMatchObject({ month: expect.any(String), amount: expect.any(Number) });
    expect(byProvider.data[0]).toMatchObject({ providerName: expect.any(String), amount: expect.any(Number) });
    expect(byFuel.data[0]).toMatchObject({ fuelType: expect.any(String), amount: expect.any(Number) });
    expect(Array.isArray(byEquipment.data)).toBe(true);
  });

  it('serves the full provider report', async () => {
    const api = new AnalyticsApi();
    const [summary, trend, byFuel, byStatus, bySector, topCustomers] = await api.getProviderReport(101, {});
    expect(summary.data).toMatchObject({ totalRevenue: expect.any(Number) });
    expect(trend.data[0]).toMatchObject({ label: expect.any(String), amount: expect.any(Number) });
    expect(byFuel.data[0]).toMatchObject({ fuelType: expect.any(String), revenue: expect.any(Number) });
    expect(byStatus.data[0]).toMatchObject({ status: expect.any(String), count: expect.any(Number) });
    expect(bySector.data[0]).toMatchObject({ sector: expect.any(String), count: expect.any(Number) });
    expect(topCustomers.data[0]).toMatchObject({
      companyId: expect.any(Number),
      companyName: expect.any(String),
      totalPurchased: expect.any(Number),
    });
  });
});
