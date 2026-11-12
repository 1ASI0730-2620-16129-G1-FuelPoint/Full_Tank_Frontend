import { describe, expect, it } from 'vitest';
import { createRouter, createMemoryHistory } from 'vue-router';
import inventoryRoutes from '../src/inventory/presentation/inventory-routes.js';
import fulfillmentRoutes from '../src/fulfillment/presentation/fulfillment-routes.js';

describe('direct entry into provider modules', () => {
    it.each([
        ['/inventory', '/inventory/products'],
        ['/fulfillment', '/fulfillment/vehicles'],
    ])('opens %s without redirecting outside its module', async (from, expected) => {
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/inventory', children: inventoryRoutes },
                { path: '/fulfillment', children: fulfillmentRoutes },
            ],
        });
        await router.push(from);
        expect(router.currentRoute.value.path).toBe(expected);
        expect(router.currentRoute.value.matched.length).toBe(2);
    });
});
