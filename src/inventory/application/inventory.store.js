/**
 * Application service store for the `Inventory` bounded context.
 * Coordinates product use cases and exposes UI-facing state.
 *
 * @module useInventoryStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { InventoryApi } from "../infrastructure/inventory-api.js";
import { ProductAssembler } from "../infrastructure/product.assembler.js";
import { Product } from "../domain/model/product.entity.js";

const inventoryApi = new InventoryApi();

const useInventoryStore = defineStore('inventory', () => {
    /** @type {import('vue').Ref<Product[]>} */
    const products = ref([]);
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const productsLoaded = ref(false);
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);

    /** @type {import('vue').ComputedRef<number>} */
    const productsCount = computed(() => productsLoaded.value ? products.value.length : 0);

    function fetchProducts() {
        loading.value = true;
        return inventoryApi.getProducts()
            .then(response => {
                products.value = ProductAssembler.toEntitiesFromResponse(response);
                productsLoaded.value = true;
                return products.value;
            })
            .catch(error => {
                errors.value.push(error);
                return [];
            })
            .finally(() => {
                loading.value = false;
            });
    }

    function getProductById(id) {
        const idNum = parseInt(id);
        return products.value.find(p => p.id === idNum || p.id === id);
    }

    function addProduct(product) {
        return inventoryApi.createProduct(product).then(response => {
            const newProduct = ProductAssembler.toEntityFromResource(response.data);
            products.value.push(newProduct);
            return newProduct;
        }).catch(error => {
            errors.value.push(error);
            return null;
        });
    }

    function updateProduct(product) {
        return inventoryApi.updateProduct(product).then(response => {
            const updated = ProductAssembler.toEntityFromResource(response.data);
            const index = products.value.findIndex(p => p.id === updated.id);
            if (index !== -1) products.value[index] = updated;
            return updated;
        }).catch(error => {
            errors.value.push(error);
            return null;
        });
    }

    function deleteProduct(product) {
        return inventoryApi.deleteProduct(product.id).then(() => {
            const index = products.value.findIndex(p => p.id === product.id);
            if (index !== -1) products.value.splice(index, 1);
            return true;
        }).catch(error => {
            errors.value.push(error);
            return false;
        });
    }

    // ── Stock & movements (Inventory BC) ──────────────────────────────────
    /** @type {import('vue').Ref<Array>} */
    const movements = ref([]);

    /** @type {import('vue').ComputedRef<Product[]>} */
    const lowStockItems = computed(() => products.value.filter(p => p.isLowStock()));

    /** @param {number} providerId @returns {Product[]} */
    function forProvider(providerId) {
        return products.value.filter(p => p.providerId === providerId);
    }

    /**
     * Finds an active stock item by provider and fuel type. Used by the
     * coordination service to check availability before accepting a request.
     * @param {number} providerId
     * @param {string} fuelType
     * @returns {Product|undefined}
     */
    function findItem(providerId, fuelType) {
        return products.value.find(p => p.providerId === providerId && p.type === fuelType);
    }

    function fetchMovements() {
        return inventoryApi.getMovements()
            .then(response => { movements.value = Array.isArray(response.data) ? response.data : []; })
            .catch(error => { errors.value.push(error); });
    }

    /**
     * Reserves stock for an accepted order (commits it so it can't be promised
     * twice). Physical stock is untouched until dispatch; only `reserved` grows.
     * @param {number} itemId
     * @param {number} quantity - Amount in the item's unit (liters).
     * @returns {Promise<void>}
     */
    async function reserveStock(itemId, quantity) {
        const item = products.value.find(p => p.id === itemId);
        if (!item) return;
        const updated = new Product({ ...item, reserved: item.reserved + Math.round(Number(quantity)) });
        const index = products.value.findIndex(p => p.id === itemId);
        if (index !== -1) products.value[index] = updated;
        try {
            await inventoryApi.updateProduct(updated);
        } catch (error) {
            errors.value.push(error);
        }
    }

    /**
     * Releases a previously reserved amount (e.g. when an accepted order is
     * cancelled before dispatch). Physical stock is untouched.
     * @param {number} itemId
     * @param {number} quantity - Amount in the item's unit (liters).
     * @returns {Promise<void>}
     */
    async function releaseReservation(itemId, quantity) {
        const item = products.value.find(p => p.id === itemId);
        if (!item) return;
        const updated = new Product({ ...item, reserved: Math.max(0, item.reserved - Math.round(Number(quantity))) });
        const index = products.value.findIndex(p => p.id === itemId);
        if (index !== -1) products.value[index] = updated;
        try {
            await inventoryApi.updateProduct(updated);
        } catch (error) {
            errors.value.push(error);
        }
    }

    /**
     * Decreases stock for an item and records an OUT movement. Used at dispatch:
     * also releases the matching reservation (the reserved fuel is now shipped).
     * @param {number} itemId
     * @param {number} quantity - Amount in the item's unit (liters).
     * @param {string} reason
     * @param {number|null} orderId
     * @returns {Promise<void>}
     */
    async function decreaseStock(itemId, quantity, reason, orderId = null) {
        const item = products.value.find(p => p.id === itemId);
        if (!item) return;
        const qty = Math.round(Number(quantity));
        const newStock = Math.max(0, item.stock - qty);
        const newReserved = Math.max(0, item.reserved - qty);
        const updated = new Product({ ...item, stock: newStock, reserved: newReserved });
        const index = products.value.findIndex(p => p.id === itemId);

        try {
            await inventoryApi.updateProduct(updated);
            if (index !== -1) products.value[index] = updated;
        } catch (error) {
            errors.value.push(error);
            return;
        }

        const movement = {
            inventoryItemId: itemId,
            providerId: item.providerId,
            type: 'OUT',
            quantity: qty,
            reason,
            orderId,
            createdAt: new Date().toISOString(),
        };
        try {
            const res = await inventoryApi.createMovement(movement);
            movements.value.push(res.data ?? movement);
        } catch (err) {
            errors.value.push(err);
            // Do not show locally fabricated inventory movements on failed persistence.
        }
    }

    /**
     * Replenishes a tank up to its maximum capacity.
     * Validates capacity and avoids showing fabricated movements on persistence failure.
     * @param {Product} item
     * @returns {Promise<Product|null>}
     */
    async function refillStock(item) {
        const capacity = Number(item?.capacity);
        if (!capacity || capacity <= 0 || !Number.isFinite(capacity)) {
            const err = new Error('Invalid tank capacity for refill');
            errors.value.push(err);
            return null;
        }

        const target = capacity;
        const currentStock = Number(item.stock) || 0;
        const added = Math.max(0, target - currentStock);
        const updated = new Product({ ...item, stock: target, status: 'ACTIVE' });
        const index = products.value.findIndex(p => p.id === item.id);

        try {
            await inventoryApi.updateProduct(updated);
            if (index !== -1) products.value[index] = updated;
        } catch (error) {
            errors.value.push(error);
            return null;
        }

        const movement = {
            inventoryItemId: item.id,
            providerId: item.providerId,
            type: 'IN',
            quantity: Math.round(added),
            reason: 'Manual refill',
            orderId: null,
            createdAt: new Date().toISOString(),
        };
        try {
            const res = await inventoryApi.createMovement(movement);
            movements.value.push(res.data ?? movement);
        } catch (err) {
            errors.value.push(err);
            // Do not show locally fabricated inventory movements on failed persistence.
        }

        return updated;
    }

    function clearErrors() {
        errors.value = [];
    }

    return {
        products,
        movements,
        errors,
        productsLoaded,
        loading,
        productsCount,
        lowStockItems,
        forProvider,
        findItem,
        fetchProducts,
        fetchMovements,
        getProductById,
        addProduct,
        updateProduct,
        deleteProduct,
        reserveStock,
        releaseReservation,
        decreaseStock,
        refillStock,
        clearErrors
    };
});

export default useInventoryStore;
