import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useInventoryStore from '../src/inventory/application/inventory.store.js';
import { InventoryApi } from '../src/inventory/infrastructure/inventory-api.js';
import { Product } from '../src/inventory/domain/model/product.entity.js';

vi.mock('../src/inventory/infrastructure/inventory-api.js', () => {
  const MockInventoryApi = vi.fn();
  MockInventoryApi.prototype.getProducts = vi.fn().mockResolvedValue({ data: [] });
  MockInventoryApi.prototype.getProductById = vi.fn();
  MockInventoryApi.prototype.createProduct = vi.fn();
  MockInventoryApi.prototype.updateProduct = vi.fn();
  MockInventoryApi.prototype.deleteProduct = vi.fn();
  MockInventoryApi.prototype.getMovements = vi.fn().mockResolvedValue({ data: [] });
  MockInventoryApi.prototype.createMovement = vi.fn();
  return { InventoryApi: MockInventoryApi };
});

describe('Inventory Store Bounded Capacity & Persistence Resilience', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('refillStock', () => {
    it('replenishes tank up to exact capacity and records an IN movement with added quantity', async () => {
      const store = useInventoryStore();
      const product = new Product({
        id: 1,
        providerId: 10,
        type: 'DIESEL_B5',
        stock: 1200,
        capacity: 5000,
        status: 'ACTIVE',
      });
      store.products = [product];

      InventoryApi.prototype.updateProduct.mockResolvedValue({ data: { ...product, stock: 5000 } });
      InventoryApi.prototype.createMovement.mockResolvedValue({
        data: { id: 99, inventoryItemId: 1, quantity: 3800, type: 'IN', reason: 'Manual refill' }
      });

      const updated = await store.refillStock(product);

      expect(updated).not.toBeNull();
      expect(updated.stock).toBe(5000);
      expect(store.products[0].stock).toBe(5000);
      expect(InventoryApi.prototype.updateProduct).toHaveBeenCalledWith(
        expect.objectContaining({ stock: 5000, status: 'ACTIVE' })
      );
      expect(InventoryApi.prototype.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ inventoryItemId: 1, quantity: 3800, type: 'IN', reason: 'Manual refill' })
      );
      expect(store.movements.length).toBe(1);
    });

    it('rejects tanks with non-positive or invalid capacity, logs error and returns null', async () => {
      const store = useInventoryStore();
      const productZeroCap = new Product({
        id: 2,
        stock: 500,
        capacity: 0,
      });
      store.products = [productZeroCap];

      const result = await store.refillStock(productZeroCap);

      expect(result).toBeNull();
      expect(store.errors.length).toBe(1);
      expect(store.errors[0].message).toContain('Invalid tank capacity');
      expect(InventoryApi.prototype.updateProduct).not.toHaveBeenCalled();
      expect(InventoryApi.prototype.createMovement).not.toHaveBeenCalled();
    });

    it('returns null and records error if updateProduct fails on refill', async () => {
      const store = useInventoryStore();
      const product = new Product({
        id: 5,
        stock: 1000,
        capacity: 5000,
      });
      store.products = [product];

      InventoryApi.prototype.updateProduct.mockRejectedValue(new Error('Network failure'));

      const result = await store.refillStock(product);

      expect(result).toBeNull();
      expect(store.errors.length).toBe(1);
      expect(InventoryApi.prototype.createMovement).not.toHaveBeenCalled();
    });

    it('does not display fabricated local movements if createMovement persistence fails', async () => {
      const store = useInventoryStore();
      const product = new Product({
        id: 3,
        stock: 1000,
        capacity: 4000,
      });
      store.products = [product];

      InventoryApi.prototype.updateProduct.mockResolvedValue({ data: product });
      InventoryApi.prototype.createMovement.mockRejectedValue(new Error('Persistence failed'));

      await store.refillStock(product);

      expect(store.movements.length).toBe(0);
      expect(store.errors.length).toBe(1);
    });
  });

  describe('decreaseStock', () => {
    it('decreases stock and records OUT movement on success', async () => {
      const store = useInventoryStore();
      const product = new Product({
        id: 4,
        providerId: 10,
        stock: 2000,
        reserved: 500,
      });
      store.products = [product];

      InventoryApi.prototype.updateProduct.mockResolvedValue({ data: product });
      InventoryApi.prototype.createMovement.mockResolvedValue({
        data: { id: 100, inventoryItemId: 4, type: 'OUT', quantity: 500 }
      });

      await store.decreaseStock(4, 500, 'Order dispatch', 101);

      expect(store.products[0].stock).toBe(1500);
      expect(store.products[0].reserved).toBe(0);
      expect(store.movements.length).toBe(1);
    });

    it('does not push fabricated movement to movements list when createMovement fails', async () => {
      const store = useInventoryStore();
      const product = new Product({
        id: 4,
        stock: 2000,
        reserved: 500,
      });
      store.products = [product];

      InventoryApi.prototype.updateProduct.mockResolvedValue({ data: product });
      InventoryApi.prototype.createMovement.mockRejectedValue(new Error('DB connection dropped'));

      await store.decreaseStock(4, 500, 'Order dispatch', 101);

      expect(store.movements.length).toBe(0);
      expect(store.errors.length).toBe(1);
    });
  });
});
