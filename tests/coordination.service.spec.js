import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import pinia from '../src/pinia.js';
import {
  acceptRequest,
  assignDelivery,
  cancelAcceptedOrder,
  confirmOrderReception,
  submitFuelRequest,
  requestManualRefill
} from '../src/shared/application/coordination.service.js';
import useOrderingStore from '../src/ordering/application/ordering.store.js';
import useInventoryStore from '../src/inventory/application/inventory.store.js';
import useFulfillmentStore from '../src/fulfillment/application/fulfillment.store.js';
import useEquipmentStore from '../src/equipment/application/equipment.store.js';
import useNotificationStore from '../src/notification/application/notification.store.js';
import { Request } from '../src/ordering/domain/model/request.entity.js';
import { Order } from '../src/ordering/domain/model/order.entity.js';
import { Product } from '../src/inventory/domain/model/product.entity.js';
import { Equipment } from '../src/equipment/domain/model/equipment.entity.js';

describe('Coordination Service Single-Call Orchestration & Guards', () => {
  beforeEach(() => {
    setActivePinia(pinia);
    vi.clearAllMocks();

    // Reset stores on project pinia for clean state isolation
    const ord = useOrderingStore(pinia);
    ord.requests = [];
    ord.orders = [];
    ord.errors = [];

    const inv = useInventoryStore(pinia);
    inv.products = [];
    inv.productsLoaded = false;
    inv.movements = [];
    inv.errors = [];

    const notif = useNotificationStore(pinia);
    notif.notifications = [];
    notif.loaded = false;

    const ful = useFulfillmentStore(pinia);
    ful.drivers = [];
    ful.vehicles = [];

    const eq = useEquipmentStore(pinia);
    eq.equipment = [];
    eq.loaded = false;
  });

  describe('Positive price guards', () => {
    it('submitFuelRequest rejects zero unit price', async () => {
      const orderingStore = useOrderingStore(pinia);
      const addSpy = vi.spyOn(orderingStore, 'createRequestAsync');

      const result = await submitFuelRequest({
        companyId: 1,
        providerId: 2,
        fuelType: 'DIESEL_B5',
        quantity: 100,
        unitPrice: 0,
      });

      expect(result).toBeNull();
      expect(addSpy).not.toHaveBeenCalled();
    });

    it('submitFuelRequest rejects negative or NaN unit price', async () => {
      const orderingStore = useOrderingStore(pinia);
      const addSpy = vi.spyOn(orderingStore, 'createRequestAsync');

      const negResult = await submitFuelRequest({
        companyId: 1,
        providerId: 2,
        fuelType: 'DIESEL_B5',
        quantity: 100,
        unitPrice: -5.5,
      });
      expect(negResult).toBeNull();

      const nanResult = await submitFuelRequest({
        companyId: 1,
        providerId: 2,
        fuelType: 'DIESEL_B5',
        quantity: 100,
        unitPrice: 'invalid',
      });
      expect(nanResult).toBeNull();

      expect(addSpy).not.toHaveBeenCalled();
    });

    it('requestManualRefill rejects non-positive unit price', async () => {
      const orderingStore = useOrderingStore(pinia);
      const inventoryStore = useInventoryStore(pinia);
      const addSpy = vi.spyOn(orderingStore, 'createRequestAsync');

      const equipmentItem = new Equipment({
        id: 1,
        companyId: 10,
        favoriteProviderId: 2,
        requiredFuelType: 'DIESEL_B5',
        capacity: 1000,
        currentLevel: 500,
      });

      inventoryStore.products = [
        new Product({ id: 5, providerId: 2, type: 'DIESEL_B5', pricePerLiter: 0, stock: 1000, status: 'ACTIVE' }),
      ];
      inventoryStore.productsLoaded = true;

      const result = await requestManualRefill(equipmentItem);

      expect(result).toEqual({ ok: false, reason: 'INVALID_PRICE' });
      expect(addSpy).not.toHaveBeenCalled();
    });
  });

  describe('Single-call server commands & return structures', () => {
    it('acceptRequest delegates to approveRequestAsync and returns { ok: true, order } on success', async () => {
      const orderingStore = useOrderingStore(pinia);
      const inventoryStore = useInventoryStore(pinia);
      const notifStore = useNotificationStore(pinia);

      inventoryStore.productsLoaded = true;
      notifStore.loaded = true;

      const request = new Request({ id: 10, providerId: 2, fuelType: 'DIESEL_B5', quantity: 500 });
      const createdOrder = new Order({ id: 201, requestId: 10, status: 'ACCEPTED' });

      const approveSpy = vi.spyOn(orderingStore, 'approveRequestAsync').mockResolvedValue(createdOrder);
      const invFetchSpy = vi.spyOn(inventoryStore, 'fetchProducts').mockResolvedValue([]);
      const notifFetchSpy = vi.spyOn(notifStore, 'fetchNotifications').mockResolvedValue([]);

      const result = await acceptRequest(request);

      expect(approveSpy).toHaveBeenCalledWith(request);
      expect(result).toEqual({ ok: true, order: createdOrder });
      expect(invFetchSpy).toHaveBeenCalledTimes(1);
      expect(notifFetchSpy).toHaveBeenCalledTimes(1);
    });

    it('acceptRequest also supports { requestId } argument shape', async () => {
      const orderingStore = useOrderingStore(pinia);
      const createdOrder = new Order({ id: 202, requestId: 11, status: 'ACCEPTED' });
      const approveSpy = vi.spyOn(orderingStore, 'approveRequestAsync').mockResolvedValue(createdOrder);

      const result = await acceptRequest({ requestId: 11 });

      expect(approveSpy).toHaveBeenCalledWith(11);
      expect(result).toEqual({ ok: true, order: createdOrder });
    });

    it('assignDelivery delegates to dispatchOrder and returns { ok: true, order } on success', async () => {
      const orderingStore = useOrderingStore(pinia);
      const fulfillmentStore = useFulfillmentStore(pinia);
      const inventoryStore = useInventoryStore(pinia);

      const order = new Order({ id: 201, providerId: 3, status: 'ACCEPTED' });
      const dispatchedOrder = new Order({ id: 201, providerId: 3, status: 'DISPATCHED', driverId: 3, vehicleId: 4 });

      fulfillmentStore.drivers = [{ id: 3 }];
      fulfillmentStore.vehicles = [{ id: 4 }];
      inventoryStore.productsLoaded = true;

      const dispatchSpy = vi.spyOn(orderingStore, 'dispatchOrder').mockResolvedValue(dispatchedOrder);
      const fleetSpy = vi.spyOn(fulfillmentStore, 'fetchVehicles').mockResolvedValue([]);
      const driverSpy = vi.spyOn(fulfillmentStore, 'fetchDrivers').mockResolvedValue([]);
      const invSpy = vi.spyOn(inventoryStore, 'fetchProducts').mockResolvedValue([]);

      const result = await assignDelivery({ order, driverId: 3, vehicleId: 4 });

      expect(dispatchSpy).toHaveBeenCalledWith(order, { driverId: 3, vehicleId: 4 });
      expect(result).toEqual({ ok: true, order: dispatchedOrder });
      expect(fleetSpy).toHaveBeenCalled();
      expect(driverSpy).toHaveBeenCalled();
      expect(invSpy).toHaveBeenCalled();
    });

    it('confirmOrderReception delegates to confirmReception and returns { ok: true, order }', async () => {
      const orderingStore = useOrderingStore(pinia);
      const equipmentStore = useEquipmentStore(pinia);

      const order = new Order({ id: 201, status: 'DISPATCHED' });
      const receivedOrder = new Order({ id: 201, status: 'PENDING_PAYMENT' });
      equipmentStore.loaded = true;

      const receiveSpy = vi.spyOn(orderingStore, 'confirmReception').mockResolvedValue(receivedOrder);
      const eqSpy = vi.spyOn(equipmentStore, 'fetchEquipment').mockResolvedValue([]);

      const result = await confirmOrderReception({ order });

      expect(receiveSpy).toHaveBeenCalledWith(order);
      expect(result).toEqual({ ok: true, order: receivedOrder });
      expect(eqSpy).toHaveBeenCalled();
    });

    it('cancelAcceptedOrder delegates to cancelOrder and returns { ok: true, order }', async () => {
      const orderingStore = useOrderingStore(pinia);
      const inventoryStore = useInventoryStore(pinia);

      const order = new Order({ id: 201, status: 'ACCEPTED' });
      const cancelledOrder = new Order({ id: 201, status: 'CANCELLED' });
      inventoryStore.productsLoaded = true;

      const cancelSpy = vi.spyOn(orderingStore, 'cancelOrder').mockResolvedValue(cancelledOrder);
      const invSpy = vi.spyOn(inventoryStore, 'fetchProducts').mockResolvedValue([]);

      const result = await cancelAcceptedOrder({ order, reason: 'Logistics cancelled' });

      expect(cancelSpy).toHaveBeenCalledWith(order, 'Logistics cancelled');
      expect(result).toEqual({ ok: true, order: cancelledOrder });
      expect(invSpy).toHaveBeenCalled();
    });
  });

  describe('Command failure isolation & no duplicate notifications', () => {
    it('command failures return { ok: false, reason } without refreshing state or duplicating notifications', async () => {
      const orderingStore = useOrderingStore(pinia);
      const inventoryStore = useInventoryStore(pinia);
      const notifStore = useNotificationStore(pinia);
      const fulfillmentStore = useFulfillmentStore(pinia);
      const equipmentStore = useEquipmentStore(pinia);

      inventoryStore.productsLoaded = true;
      notifStore.loaded = true;
      equipmentStore.loaded = true;

      vi.spyOn(orderingStore, 'approveRequestAsync').mockResolvedValue(null);
      vi.spyOn(orderingStore, 'dispatchOrder').mockResolvedValue(null);
      vi.spyOn(orderingStore, 'cancelOrder').mockResolvedValue(null);
      vi.spyOn(orderingStore, 'confirmReception').mockResolvedValue(null);

      const invFetchSpy = vi.spyOn(inventoryStore, 'fetchProducts');
      const notifFetchSpy = vi.spyOn(notifStore, 'fetchNotifications');
      const notifCreateSpy = vi.spyOn(notifStore, 'createNotification');
      const driverFetchSpy = vi.spyOn(fulfillmentStore, 'fetchDrivers');
      const eqFetchSpy = vi.spyOn(equipmentStore, 'fetchEquipment');

      const appRes = await acceptRequest({ id: 99 });
      expect(appRes).toEqual({ ok: false, reason: 'APPROVE_FAILED' });

      const dispRes = await assignDelivery({ order: { id: 99 }, driverId: 1, vehicleId: 2 });
      expect(dispRes).toEqual({ ok: false, reason: 'DISPATCH_FAILED' });

      const cancelRes = await cancelAcceptedOrder({ order: { id: 99 }, reason: 'Fail' });
      expect(cancelRes).toEqual({ ok: false, reason: 'CANCEL_FAILED' });

      const recRes = await confirmOrderReception({ order: { id: 99 } });
      expect(recRes).toEqual({ ok: false, reason: 'RECEIVE_FAILED' });

      // None of the refreshes or notifications must have been triggered on failure
      expect(invFetchSpy).not.toHaveBeenCalled();
      expect(notifFetchSpy).not.toHaveBeenCalled();
      expect(notifCreateSpy).not.toHaveBeenCalled();
      expect(driverFetchSpy).not.toHaveBeenCalled();
      expect(eqFetchSpy).not.toHaveBeenCalled();
    });
  });
});
