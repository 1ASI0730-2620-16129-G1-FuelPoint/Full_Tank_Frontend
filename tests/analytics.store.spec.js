import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useAnalyticsStore from '../src/reporting/application/analytics.store.js';
import { AnalyticsApi } from '../src/reporting/infrastructure/analytics-api.js';

vi.mock('../src/reporting/infrastructure/analytics-api.js', () => {
  const MockAnalyticsApi = vi.fn();
  MockAnalyticsApi.prototype.getBuyerDashboard = vi.fn();
  MockAnalyticsApi.prototype.getProviderDashboard = vi.fn();
  MockAnalyticsApi.prototype.getBuyerReport = vi.fn();
  MockAnalyticsApi.prototype.getProviderReport = vi.fn();
  return { AnalyticsApi: MockAnalyticsApi };
});

/**
 * The reporting views pass the month as a zero-based index (the value used by
 * the period filter), while the API expects a calendar month. These specs lock
 * that translation and the loading/error contract the views rely on.
 */
describe('Analytics store', () => {
  /** @type {AnalyticsApi} */
  let api;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    api = AnalyticsApi.prototype;
  });

  const reportResponses = () => [
    { data: { total: 1000 } },
    { data: [1, 2, 3] },
    { data: [{ provider: 'Energía del Pacífico' }] },
    { data: [{ fuelType: 'DIESEL_B5' }] },
    { data: [{ equipment: 'Excavadora' }] },
  ];

  it('translates the zero-based month into a calendar month', async () => {
    api.getBuyerReport.mockResolvedValue(reportResponses());
    const store = useAnalyticsStore();

    await store.fetchBuyerReport(100, 2026, 0);

    expect(api.getBuyerReport).toHaveBeenCalledWith(100, { year: 2026, month: 1 });
  });

  it('omits the month when the filter is set to all months', async () => {
    api.getBuyerReport.mockResolvedValue(reportResponses());
    const store = useAnalyticsStore();

    await store.fetchBuyerReport(100, 2026, null);

    expect(api.getBuyerReport).toHaveBeenCalledWith(100, { year: 2026, month: undefined });
  });

  it('groups the five buyer report responses into a single read model', async () => {
    api.getBuyerReport.mockResolvedValue(reportResponses());
    const store = useAnalyticsStore();

    const report = await store.fetchBuyerReport(100, 2026, 5);

    expect(Object.keys(report)).toEqual(['summary', 'trend', 'byProvider', 'byFuel', 'byEquipment']);
    expect(report.summary).toEqual({ total: 1000 });
    expect(store.buyerReport).toBe(report);
  });

  it('groups the six provider report responses into a single read model', async () => {
    api.getProviderReport.mockResolvedValue([
      { data: { revenue: 5000 } },
      { data: [10, 20] },
      { data: [] },
      { data: [] },
      { data: [] },
      { data: [{ name: 'Transportes Rímac' }] },
    ]);
    const store = useAnalyticsStore();

    const report = await store.fetchProviderReport(7, 2026, 11);

    expect(api.getProviderReport).toHaveBeenCalledWith(7, { year: 2026, month: 12 });
    expect(Object.keys(report)).toEqual(['summary', 'trend', 'byFuel', 'byStatus', 'bySector', 'topCustomers']);
    expect(report.topCustomers).toEqual([{ name: 'Transportes Rímac' }]);
  });

  it('stores the dashboards returned by the API', async () => {
    api.getBuyerDashboard.mockResolvedValue({ data: { activeOrders: 3 } });
    api.getProviderDashboard.mockResolvedValue({ data: { pendingRequests: 12 } });
    const store = useAnalyticsStore();

    await store.fetchBuyerDashboard(100);
    await store.fetchProviderDashboard(7);

    expect(store.buyerDashboard).toEqual({ activeOrders: 3 });
    expect(store.providerDashboard).toEqual({ pendingRequests: 12 });
  });

  it('turns the loading flag off once a request settles', async () => {
    api.getBuyerDashboard.mockResolvedValue({ data: {} });
    const store = useAnalyticsStore();

    const pending = store.fetchBuyerDashboard(100);
    expect(store.loading).toBe(true);

    await pending;
    expect(store.loading).toBe(false);
  });

  it('keeps the failure in the store and rethrows it for the view', async () => {
    const failure = new Error('network down');
    api.getProviderDashboard.mockRejectedValue(failure);
    const store = useAnalyticsStore();

    await expect(store.fetchProviderDashboard(7)).rejects.toThrow('network down');
    expect(store.error).toBe(failure);
    expect(store.loading).toBe(false);
  });

  it('clears a previous error when a new request starts', async () => {
    api.getBuyerDashboard
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValueOnce({ data: { activeOrders: 1 } });
    const store = useAnalyticsStore();

    await expect(store.fetchBuyerDashboard(100)).rejects.toThrow('first failure');
    await store.fetchBuyerDashboard(100);

    expect(store.error).toBeNull();
  });
});
