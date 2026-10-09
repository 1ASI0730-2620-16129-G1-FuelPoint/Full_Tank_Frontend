/**
 * Cross-context coordination service (application layer).
 *
 * This is the ONLY place where multiple bounded contexts are orchestrated
 * together. Presentation components never import another context's store: they
 * emit events, and the route-level page calls one of these use cases. Each
 * function below talks to the involved contexts exclusively through their
 * public store actions, keeping the contexts decoupled from each other.
 *
 * Contexts touched here: Ordering, Inventory, Fulfillment, Payment,
 * Notification and Equipment. Identity comes from IAM.
 *
 * @module coordination.service
 */
import pinia from "../../pinia.js";
import useOrderingStore from "../../ordering/application/ordering.store.js";
import useInventoryStore from "../../inventory/application/inventory.store.js";
import useNotificationStore from "../../notification/application/notification.store.js";
import usePaymentStore from "../../payment/application/payment.store.js";
import useFulfillmentStore from "../../fulfillment/application/fulfillment.store.js";
import useEquipmentStore from "../../equipment/application/equipment.store.js";
import { fuelTypeLabel } from "../domain/fuel-types.js";

const LITERS_PER_GALLON = 3.78541;

/** Converts a quantity to liters so it can be discounted from tank stock. */
function toLiters(quantity, unit) {
    return unit === 'GALLONS' ? Number(quantity) * LITERS_PER_GALLON : Number(quantity);
}

const ordering = () => useOrderingStore(pinia);
const inventory = () => useInventoryStore(pinia);
const notifications = () => useNotificationStore(pinia);
const payments = () => usePaymentStore(pinia);
const fulfillment = () => useFulfillmentStore(pinia);
const equipment = () => useEquipmentStore(pinia);

/**
 * Application read use case: list a buyer's equipment so another context
 * (e.g. Catalog) can offer an equipment picker without importing the Equipment
 * store directly. Loads it on demand if not present.
 *
 * @param {number} companyId
 * @returns {Promise<import('../../equipment/domain/model/equipment.entity.js').Equipment[]>}
 */
export async function listCompanyEquipment(companyId) {
    const store = equipment();
    if (!store.loaded) await store.fetchEquipment();
    return store.forCompany(companyId);
}

/**
 * Application read use case: list available drivers + vehicles so the Ordering
 * page can offer a driver/vehicle picker without importing the Fulfillment store
 * directly. Loads resources on demand.
 *
 * @param {number|string} providerId
 * @returns {Promise<{ drivers:Array, vehicles:Array }>}
 */
export async function listAvailableResources(providerId) {
    const store = fulfillment();
    await Promise.all([
        store.fetchDrivers(providerId),
        store.fetchVehicles(providerId),
    ]);
    return { drivers: store.availableDrivers, vehicles: store.availableVehicles };
}

/**
 * Application read use case: resolve all drivers + vehicles (including assigned
 * ones) so the Ordering order-detail page can display the names assigned to an
 * order without importing the Fulfillment store directly.
 *
 * @param {number|string} providerId
 * @returns {Promise<{ drivers:Array, vehicles:Array }>}
 */
export async function listAllResources(providerId) {
    const store = fulfillment();
    await Promise.all([
        store.fetchDrivers(providerId),
        store.fetchVehicles(providerId),
    ]);
    return { drivers: store.drivers, vehicles: store.vehicles };
}

/**
 * Buyer use case: create a fuel request (from Catalog or Equipment) and notify
 * both parties. Catalog/Equipment components emit an event; their page calls
 * this — they never touch the Ordering or Notification stores themselves.
 *
 * @param {Object} payload - Request attributes (companyId, providerId, fuelType…).
 * @returns {Promise<import('../../ordering/domain/model/request.entity.js').Request|null>}
 */
export async function submitFuelRequest(payload) {
    if (!Number.isFinite(Number(payload.unitPrice)) || Number(payload.unitPrice) <= 0) {
        return null;
    }
    const request = await ordering().createRequestAsync(payload);
    if (!request) return null;

    const fuel = fuelTypeLabel(payload.fuelType);
    await notifications().createNotification({
        recipientType: 'PROVIDER',
        providerId: payload.providerId,
        type: 'NEW_REQUEST',
        titleKey: 'notification.new-request-title',
        messageKey: 'notification.new-request-msg',
        params: { qty: payload.quantity, unit: payload.unit?.toLowerCase(), fuel },
        relatedId: request.id,
    });
    await notifications().createNotification({
        recipientType: 'BUYER',
        companyId: payload.companyId,
        type: 'ORDER_CREATED',
        titleKey: 'notification.order-created-title',
        messageKey: 'notification.order-created-msg',
        params: { fuel },
        relatedId: request.id,
    });
    return request;
}

/**
 * Equipment use case: attempt an automatic refill. Checks the favorite
 * provider's stock (via Inventory, the only context that knows stock) and either
 * creates a request or raises a "no stock" buyer notification.
 *
 * @param {import('../../equipment/domain/model/equipment.entity.js').Equipment} item
 * @param {string} deliveryAddress
 * @returns {Promise<{ ok:boolean, reason?:string }>}
 */
async function ensureInventoryLoaded() {
    const store = inventory();
    if (!store.productsLoaded) await store.fetchProducts();
}

export async function triggerAutoRefill(item, deliveryAddress = '') {
    await ensureInventoryLoaded();
    const providerId = item.favoriteProviderId;
    const missing = Math.max(0, item.capacity - item.currentLevel);
    const stockItem = inventory().findItem(providerId, item.requiredFuelType);
    const hasStock = stockItem && stockItem.status === 'ACTIVE' && stockItem.availableStock() >= toLiters(missing, item.unit);

    if (!providerId || !hasStock) {
        await notifications().createNotification({
            recipientType: 'BUYER',
            companyId: item.companyId,
            type: 'NO_STOCK',
            titleKey: 'notification.no-stock-title',
            messageKey: 'notification.no-stock-msg',
            params: { name: item.name, fuel: fuelTypeLabel(item.requiredFuelType) },
            relatedId: item.id,
        });
        return { ok: false, reason: 'NO_STOCK' };
    }

    if (!Number.isFinite(Number(stockItem.pricePerLiter)) || Number(stockItem.pricePerLiter) <= 0) {
        return { ok: false, reason: 'INVALID_PRICE' };
    }

    const created = await submitFuelRequest({
        companyId: item.companyId,
        providerId,
        equipmentId: item.id,
        fuelType: item.requiredFuelType,
        productName: stockItem.name,
        quantity: Math.round(missing),
        unit: item.unit,
        unitPrice: stockItem.pricePerLiter,
        deliveryAddress: deliveryAddress || item.location,
        deliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        source: 'AUTO_REFILL',
    });
    return { ok: !!created };
}

/**
 * Manual refill request triggered from an equipment card. Resolves the product
 * name and price from the favorite provider's inventory so the Equipment page
 * never imports Catalog/Inventory data itself.
 *
 * @param {import('../../equipment/domain/model/equipment.entity.js').Equipment} item
 * @param {{ quantity?:number, deliveryAddress?:string }} [options]
 * @returns {Promise<{ ok:boolean, reason?:string, request?:Object }>}
 */
export async function requestManualRefill(itemOrParams, options = {}) {
    await ensureInventoryLoaded();
    let item = itemOrParams;
    let opts = options;
    let customUnitPrice = null;

    if (itemOrParams && typeof itemOrParams === 'object' && !itemOrParams.favoriteProviderId && itemOrParams.equipment) {
        item = itemOrParams.equipment;
        opts = {
            quantity: itemOrParams.amount ?? itemOrParams.quantity ?? options.quantity,
            deliveryAddress: itemOrParams.deliveryAddress ?? options.deliveryAddress,
        };
        if (itemOrParams.product && 'pricePerLiter' in itemOrParams.product) {
            customUnitPrice = Number(itemOrParams.product.pricePerLiter);
        }
    }

    const providerId = item?.favoriteProviderId;
    if (!providerId) return { ok: false, reason: 'NO_PROVIDER' };

    const stockItem = inventory().findItem(providerId, item.requiredFuelType);
    const unitPrice = customUnitPrice !== null ? customUnitPrice : Number(stockItem?.pricePerLiter);

    if (customUnitPrice !== null && (!Number.isFinite(unitPrice) || unitPrice <= 0)) {
        return { ok: false, reason: 'INVALID_PRICE' };
    }
    if (!stockItem || !Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { ok: false, reason: 'INVALID_PRICE' };
    }

    const quantity = opts.quantity ?? Math.max(1, Math.round(item.capacity - item.currentLevel));

    // Informative stock validation
    if (stockItem.status !== 'ACTIVE' || stockItem.availableStock() < toLiters(quantity, item.unit)) {
        return { ok: false, reason: 'NO_STOCK' };
    }

    const request = await submitFuelRequest({
        companyId: item.companyId,
        providerId,
        equipmentId: item.id,
        fuelType: item.requiredFuelType,
        productName: stockItem?.name ?? fuelTypeLabel(item.requiredFuelType),
        quantity,
        unit: item.unit,
        unitPrice,
        deliveryAddress: opts.deliveryAddress || item.location,
        deliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
        source: 'MANUAL',
    });
    return { ok: !!request, request };
}

/**
 * Provider use case: accept a request via agreed backend server command.
 * POST /api/v1/fuel-requests/{id}/approve (empty body) -> OrderResource
 * The backend atomically maintains stock/reservation/movements and notifications.
 *
 * @param {import('../../ordering/domain/model/request.entity.js').Request|number|string|{requestId:number|string}} requestOrParams
 * @returns {Promise<{ ok:boolean, reason?:string, order?:Object }>}
 */
export async function acceptRequest(requestOrParams) {
    const target = (requestOrParams && typeof requestOrParams === 'object' && 'requestId' in requestOrParams)
        ? requestOrParams.requestId
        : requestOrParams;
    const order = await ordering().approveRequestAsync(target);
    if (!order) {
        return { ok: false, reason: 'APPROVE_FAILED' };
    }

    // Refresh relevant affected state only AFTER success
    if (inventory().productsLoaded) {
        await inventory().fetchProducts();
    }
    if (notifications().loaded) {
        await notifications().fetchNotifications();
    }

    return { ok: true, order };
}

/**
 * Provider use case: reject a request and notify the buyer.
 * @param {import('../../ordering/domain/model/request.entity.js').Request} request
 * @returns {Promise<{ ok:boolean }>}
 */
export async function rejectRequest(request, { code = 'OTHER', note = '' } = {}) {
    await ordering().rejectRequestAsync(request, code, note);
    await notifications().createNotification({
        recipientType: 'BUYER',
        companyId: request.companyId ?? request.clientId,
        type: 'REQUEST_REJECTED',
        titleKey: 'notification.request-rejected-title',
        messageKey: 'notification.request-rejected-msg',
        params: { fuel: fuelTypeLabel(request.fuelType) },
        relatedId: request.id,
    });
    return { ok: true };
}

/**
 * Provider use case (Fulfillment): dispatch an order via agreed backend server command.
 * POST /api/v1/orders/{id}/dispatch { driverId, vehicleId } -> OrderResource
 * The backend atomically decrements physical stock, updates delivery and creates notifications.
 *
 * @param {{ order?:Object, orderId?:number|string, driverId:number, vehicleId:number }} params
 * @returns {Promise<{ ok:boolean, reason?:string, order?:Object }>}
 */
export async function assignDelivery(params = {}) {
    const order = params?.order ?? params?.orderId;
    const driverId = params?.driverId;
    const vehicleId = params?.vehicleId;
    const dispatched = await ordering().dispatchOrder(order, { driverId, vehicleId });
    if (!dispatched) {
        return { ok: false, reason: 'DISPATCH_FAILED' };
    }

    // Refresh relevant affected state only AFTER success
    const provId = (typeof order === 'object' && order !== null ? order.providerId : null) ?? dispatched?.providerId;
    if (provId && (fulfillment().drivers.length || fulfillment().vehicles.length)) {
        await Promise.all([
            fulfillment().fetchDrivers(provId),
            fulfillment().fetchVehicles(provId),
        ]);
    }
    if (inventory().productsLoaded) {
        await inventory().fetchProducts();
    }
    if (notifications().loaded) {
        await notifications().fetchNotifications();
    }

    return { ok: true, order: dispatched };
}

/**
 * Provider use case: cancel an ACCEPTED order before dispatch via backend server command.
 * POST /api/v1/orders/{id}/cancel { reason } -> OrderResource
 * The backend atomically releases reserved stock and creates notifications.
 *
 * @param {{ order?:Object, orderId?:number|string, reason?:string }} params
 * @returns {Promise<{ ok:boolean, reason?:string, order?:Object }>}
 */
export async function cancelAcceptedOrder(params = {}) {
    const order = params?.order ?? params?.orderId;
    const reason = params?.reason ?? '';
    const cancelled = await ordering().cancelOrder(order, reason);
    if (!cancelled) {
        return { ok: false, reason: 'CANCEL_FAILED' };
    }

    // Refresh relevant affected state only AFTER success
    if (inventory().productsLoaded) {
        await inventory().fetchProducts();
    }
    if (notifications().loaded) {
        await notifications().fetchNotifications();
    }

    return { ok: true, order: cancelled };
}

/**
 * Buyer use case: confirm reception of a dispatched order via backend server command.
 * POST /api/v1/orders/{id}/receive (empty body) -> OrderResource
 * The backend atomically moves order to PENDING_PAYMENT, tops up equipment, completes delivery and creates notifications.
 *
 * @param {{ order?:Object, orderId?:number|string }} params
 * @returns {Promise<{ ok:boolean, reason?:string, order?:Object }>}
 */
export async function confirmOrderReception(params = {}) {
    const order = params?.order ?? params?.orderId;
    const received = await ordering().confirmReception(order);
    if (!received) {
        return { ok: false, reason: 'RECEIVE_FAILED' };
    }

    // Refresh relevant affected state only AFTER success
    if (equipment().loaded) {
        await equipment().fetchEquipment();
    }
    const provId = (typeof order === 'object' && order !== null ? order.providerId : null) ?? received?.providerId;
    if (provId && (fulfillment().drivers.length || fulfillment().vehicles.length)) {
        await Promise.all([
            fulfillment().fetchDrivers(provId),
            fulfillment().fetchVehicles(provId),
        ]);
    }
    if (notifications().loaded) {
        await notifications().fetchNotifications();
    }

    return { ok: true, order: received };
}

/**
 * Buyer use case (Payment): pay an order, generating a payment + invoice and
 * flipping the order's payment status. Notifies the buyer.
 *
 * @param {{ order:Object, method:string, card:Object, buyer:Object, provider:Object }} params
 * @returns {Promise<{ payment:Object, invoice:Object }|null>}
 */
export async function completePayment({ order, method, card, buyer, provider }) {
    const result = await payments().payOrder({ order, method, card, buyer, provider });
    if (!result) return null;

    const paidOrder = ordering().markOrderPaidLocally(order.id);
    if (!paidOrder) return null;

    await notifications().createNotification({
        recipientType: 'BUYER',
        companyId: order.companyId ?? order.clientId,
        type: 'PAYMENT_REGISTERED',
        titleKey: 'notification.payment-registered-title',
        messageKey: 'notification.payment-registered-msg',
        params: { id: order.id },
        relatedId: order.id,
    });
    await notifications().createNotification({
        recipientType: 'BUYER',
        companyId: order.companyId ?? order.clientId,
        type: 'INVOICE_GENERATED',
        titleKey: 'notification.invoice-generated-title',
        messageKey: 'notification.invoice-generated-msg',
        params: { invoice: result.invoice?.invoiceNumber ?? '' },
        relatedId: order.id,
    });
    return result;
}
