import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useOrderingStore from '../src/ordering/application/ordering.store.js';
import { OrderingApi } from '../src/ordering/infrastructure/ordering-api.js';
import { Request } from '../src/ordering/domain/model/request.entity.js';
import { Order } from '../src/ordering/domain/model/order.entity.js';

vi.mock('../src/ordering/infrastructure/ordering-api.js', () => {
  const MockOrderingApi = vi.fn();
  MockOrderingApi.prototype.getRequests = vi.fn().mockResolvedValue({ data: [] });
  MockOrderingApi.prototype.getOrders = vi.fn().mockResolvedValue({ data: [] });
  MockOrderingApi.prototype.createRequest = vi.fn();
  MockOrderingApi.prototype.updateRequest = vi.fn();
  MockOrderingApi.prototype.deleteRequest = vi.fn();
  MockOrderingApi.prototype.createOrder = vi.fn();
  MockOrderingApi.prototype.updateOrder = vi.fn();
  MockOrderingApi.prototype.deleteOrder = vi.fn();
  MockOrderingApi.prototype.approveFuelRequest = vi.fn();
  MockOrderingApi.prototype.dispatchOrder = vi.fn();
  MockOrderingApi.prototype.receiveOrder = vi.fn();
  MockOrderingApi.prototype.cancelOrder = vi.fn();
  return { OrderingApi: MockOrderingApi };
});

describe('Ordering Store Audit Regression Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('updateRequestAsync', () => {
    it('returns the updated FuelRequest entity on success', async () => {
      const store = useOrderingStore();
      const initial = new Request({ id: 10, status: 'PENDING', quantity: 500 });
      store.requests = [initial];

      const updatedData = { id: 10, status: 'PENDING', quantity: 800 };
      OrderingApi.prototype.updateRequest.mockResolvedValue({ data: updatedData });

      const result = await store.updateRequestAsync(new Request(updatedData));

      expect(result).not.toBeNull();
      expect(result.id).toBe(10);
      expect(result.quantity).toBe(800);
      expect(store.requests[0].quantity).toBe(800);
    });

    it('returns null and records error on update failure', async () => {
      const store = useOrderingStore();
      store.requests = [new Request({ id: 10, status: 'PENDING', quantity: 500 })];

      OrderingApi.prototype.updateRequest.mockRejectedValue(new Error('Network error'));

      const result = await store.updateRequestAsync(new Request({ id: 10, quantity: 800 }));

      expect(result).toBeNull();
      expect(store.errors.length).toBe(1);
    });
  });

  describe('Server command workflows', () => {
    it('approveRequestAsync accepts an ID, calls approveFuelRequest command and sets request status to APPROVED', async () => {
      const store = useOrderingStore();
      store.requests = [new Request({ id: 42, status: 'PENDING' })];

      const orderResource = {
        id: 101,
        requestId: 42,
        status: 'ACCEPTED',
        totalAmount: 1500,
      };
      OrderingApi.prototype.approveFuelRequest.mockResolvedValue({ data: orderResource });

      const result = await store.approveRequestAsync(42);

      expect(OrderingApi.prototype.approveFuelRequest).toHaveBeenCalledWith(42);
      expect(result).not.toBeNull();
      expect(result.id).toBe(101);
      expect(store.orders.some(o => o.id === 101)).toBe(true);
      expect(store.requests.find(r => r.id === 42).status).toBe('APPROVED');
    });

    it('approveRequestAsync accepts a Request entity argument', async () => {
      const store = useOrderingStore();
      const req = new Request({ id: 43, status: 'PENDING' });
      store.requests = [req];

      const orderResource = { id: 102, requestId: 43, status: 'ACCEPTED' };
      OrderingApi.prototype.approveFuelRequest.mockResolvedValue({ data: orderResource });

      const result = await store.approveRequestAsync(req);

      expect(OrderingApi.prototype.approveFuelRequest).toHaveBeenCalledWith(43);
      expect(result.id).toBe(102);
      expect(store.requests.find(r => r.id === 43).status).toBe('APPROVED');
    });

    it('dispatchOrder calls server dispatchOrder command with driverId and vehicleId for both entity and ID', async () => {
      const store = useOrderingStore();
      const order = new Order({ id: 101, status: 'ACCEPTED', driverId: null, vehicleId: null });
      store.orders = [order];

      const dispatchedResource = {
        id: 101,
        status: 'DISPATCHED',
        driverId: 5,
        vehicleId: 8,
        dispatchedAt: '2026-06-01T10:00:00Z',
      };
      OrderingApi.prototype.dispatchOrder.mockResolvedValue({ data: dispatchedResource });

      // Test with Order entity
      const result = await store.dispatchOrder(order, { driverId: 5, vehicleId: 8 });

      expect(OrderingApi.prototype.dispatchOrder).toHaveBeenCalledWith(101, { driverId: 5, vehicleId: 8 });
      expect(result.status).toBe('DISPATCHED');
      expect(result.driverId).toBe(5);
      expect(store.orders.find(o => o.id === 101).status).toBe('DISPATCHED');

      // Test with numeric ID
      await store.dispatchOrder(101, { driverId: 6, vehicleId: 9 });
      expect(OrderingApi.prototype.dispatchOrder).toHaveBeenCalledWith(101, { driverId: 6, vehicleId: 9 });
    });

    it('confirmReception calls server receiveOrder command for both entity and ID', async () => {
      const store = useOrderingStore();
      const order = new Order({ id: 101, status: 'DISPATCHED' });
      store.orders = [order];

      const receivedResource = {
        id: 101,
        status: 'PENDING_PAYMENT',
        deliveredAt: '2026-06-01T14:00:00Z',
      };
      OrderingApi.prototype.receiveOrder.mockResolvedValue({ data: receivedResource });

      // Test with Order entity
      const result = await store.confirmReception(order);

      expect(OrderingApi.prototype.receiveOrder).toHaveBeenCalledWith(101);
      expect(result.status).toBe('PENDING_PAYMENT');
      expect(store.orders.find(o => o.id === 101).status).toBe('PENDING_PAYMENT');

      // Test with numeric ID
      await store.confirmReception(101);
      expect(OrderingApi.prototype.receiveOrder).toHaveBeenCalledWith(101);
    });

    it('cancelOrder calls server cancelOrder command with reason string for both entity and ID', async () => {
      const store = useOrderingStore();
      const order = new Order({ id: 101, status: 'ACCEPTED' });
      store.orders = [order];

      const cancelledResource = {
        id: 101,
        status: 'CANCELLED',
        cancellationReason: 'Out of stock at depot',
      };
      OrderingApi.prototype.cancelOrder.mockResolvedValue({ data: cancelledResource });

      // Test with Order entity
      const result = await store.cancelOrder(order, 'Out of stock at depot');

      expect(OrderingApi.prototype.cancelOrder).toHaveBeenCalledWith(101, 'Out of stock at depot');
      expect(result.status).toBe('CANCELLED');
      expect(store.orders.find(o => o.id === 101).status).toBe('CANCELLED');

      // Test with numeric ID
      await store.cancelOrder(101, 'Another reason');
      expect(OrderingApi.prototype.cancelOrder).toHaveBeenCalledWith(101, 'Another reason');
    });

    it('server commands record errors and return null on backend failure', async () => {
      const store = useOrderingStore();
      OrderingApi.prototype.approveFuelRequest.mockRejectedValue(new Error('Server 500'));
      OrderingApi.prototype.dispatchOrder.mockRejectedValue(new Error('Driver unavailable'));
      OrderingApi.prototype.receiveOrder.mockRejectedValue(new Error('Order already closed'));
      OrderingApi.prototype.cancelOrder.mockRejectedValue(new Error('Cannot cancel dispatched order'));

      expect(await store.approveRequestAsync(99)).toBeNull();
      expect(await store.dispatchOrder(99, { driverId: 1, vehicleId: 2 })).toBeNull();
      expect(await store.confirmReception(99)).toBeNull();
      expect(await store.cancelOrder(99, 'Test reason')).toBeNull();

      expect(store.errors.length).toBe(4);
    });
  });
});
