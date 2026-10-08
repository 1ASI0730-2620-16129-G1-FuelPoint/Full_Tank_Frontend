import { beforeEach } from 'vitest';

// Isolated test environment configuration for Vitest
// Provides dummy API URL and bounded-context endpoint paths so BaseApi and stores
// instantiate safely without relying on a live backend network.

const testEnv = {
  VITE_FULLTANK_API_URL: 'http://localhost:5204/api/v1',
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

for (const [key, value] of Object.entries(testEnv)) {
  if (typeof process !== 'undefined' && process.env) {
    process.env[key] = value;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    try {
      import.meta.env[key] = value;
    } catch {
      // ignore
    }
  }
}

// In-memory Web Storage implementation for Node environment
class MemoryStorage {
  #map = new Map();

  getItem(key) {
    return this.#map.has(String(key)) ? this.#map.get(String(key)) : null;
  }

  setItem(key, value) {
    this.#map.set(String(key), String(value));
  }

  removeItem(key) {
    this.#map.delete(String(key));
  }

  clear() {
    this.#map.clear();
  }

  key(index) {
    const keys = Array.from(this.#map.keys());
    return keys[index] ?? null;
  }

  get length() {
    return this.#map.size;
  }
}

const memoryStorageInstance = new MemoryStorage();

// Ensure global localStorage and window exist in Node
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorageInstance,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.window.localStorage === 'undefined') {
  globalThis.window.localStorage = memoryStorageInstance;
}

// Reset storage before each test for clean isolation
beforeEach(() => {
  globalThis.localStorage.clear();
});
