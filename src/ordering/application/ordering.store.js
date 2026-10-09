import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { OrderingApi } from "../infrastructure/ordering-api.js";
import { RequestAssembler } from "../infrastructure/request.assembler.js";
import { OrderAssembler } from "../infrastructure/order.assembler.js";
import { Request } from "../domain/model/request.entity.js";
import { Order } from "../domain/model/order.entity.js";

const orderingApi = new OrderingApi();
const useOrdersEndpoint = true;

const requestOrderStatusMap = {
    APPROVED: 'ACCEPTED',
    IN_TRANSIT: 'DISPATCHED',
    DELIVERED: 'PENDING_PAYMENT',
    CLOSED: 'PAID',
};

function isMissingOrdersEndpoint(error) {
    return error?.response?.status === 404;
}

function orderFromRequest(request) {
    return new Order({
        id: request.id,
        requestId: request.id,
        clientId: request.clientId,
        providerId: request.providerId,
        fuelType: request.fuelType,
        quantity: request.quantity,
        unit: request.unit,
        totalAmount: 0,
        deliveryAddress: request.deliveryAddress,
        status: requestOrderStatusMap[request.status] ?? 'CREATED',
        createdAt: request.createdAt,
        updatedAt: request.updatedAt ?? request.createdAt,
    });
}

function ordersFromRequests(requests) {
    return requests
        .filter(request => requestOrderStatusMap[request.status])
        .map(orderFromRequest);
}

const useOrderingStore = defineStore('ordering', () => {

    // ── Requests ────────────────────────────────────────────────────────────
    /** @type {import('vue').Ref<Request[]>} */
    const requests = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const requestsLoaded = ref(false);

    /** @type {import('vue').ComputedRef<Request[]>} */
    const pendingRequests = computed(() => requests.value.filter(r => r.status === 'PENDING'));
    /** @type {import('vue').ComputedRef<Request[]>} */
    const approvedRequests = computed(() => requests.value.filter(r => r.status === 'APPROVED'));

    // ── Orders ──────────────────────────────────────────────────────────────
    /** @type {import('vue').Ref<Order[]>} */
    const orders = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const ordersLoaded = ref(false);

    /** @type {import('vue').ComputedRef<Order[]>} */
    const activeOrders = computed(() =>
        orders.value.filter(o => ['ACCEPTED', 'DISPATCHED', 'PENDING_PAYMENT'].includes(o.status))
    );
    /** @type {import('vue').ComputedRef<Order[]>} */
    const closedOrders = computed(() =>
        orders.value.filter(o => o.status === 'PAID' || o.status === 'CLOSED')
    );

    // ── Shared state ────────────────────────────────────────────────────────
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);

    /** @type {import('vue').ComputedRef<number>} */
    const requestsCount = computed(() => requestsLoaded.value ? requests.value.length : 0);

    // ── Request actions ─────────────────────────────────────────────────────
    function fetchRequests() {
        loading.value = true;
        orderingApi.getRequests().then(response => {
            requests.value = RequestAssembler.toEntitiesFromResponse(response);
            requestsLoaded.value = true;
        }).catch(error => {
            errors.value.push(error);
        }).finally(() => {
            loading.value = false;
        });
    }

    function getRequestById(id) {
        const idNum = parseInt(id);
        return requests.value.find(r => r.id === idNum || r.id === id);
    }

    function addRequest(request) {
        return orderingApi.createRequest(request).then(response => {
            const newRequest = RequestAssembler.toEntityFromResource(response.data);
            requests.value.push(newRequest);
            return newRequest;
        }).catch(error => {
            errors.value.push(error);
            return null;
        });
    }

    function updateRequest(request) {
        return orderingApi.updateRequest(request).then(response => {
            const updated = RequestAssembler.toEntityFromResource(response.data);
            const index = requests.value.findIndex(r => r.id === updated.id);
            if (index !== -1) requests.value[index] = updated;
            return updated;
        }).catch(error => {
            errors.value.push(error);
            return null;
        });
    }

    function deleteRequest(request) {
        orderingApi.deleteRequest(request.id).then(() => {
            const index = requests.value.findIndex(r => r.id === request.id);
            if (index !== -1) requests.value.splice(index, 1);
        }).catch(error => {
            errors.value.push(error);
        });
    }

    function approveRequest(request) {
        const approved = new Request({ ...request, status: 'APPROVED' });
        updateRequest(approved);

        const now = new Date().toISOString();
        const newOrder = new Order({
            requestId:       request.id,
            clientId:        request.clientId,
            providerId:      request.providerId,
            fuelType:        request.fuelType,
            quantity:        request.quantity,
            unit:            request.unit,
            totalAmount:     0,
            deliveryAddress: request.deliveryAddress,
            status:          'CREATED',
            createdAt:       now,
            updatedAt:       now,
        });
        addOrder(newOrder);
    }

    function rejectRequest(request) {
        const updated = new Request({ ...request, status: 'REJECTED' });
        updateRequest(updated);
    }

    // ── Order actions ───────────────────────────────────────────────────────
    function fetchOrders() {
        loading.value = true;
        if (!useOrdersEndpoint) {
            orderingApi.getRequests().then(response => {
                requests.value = RequestAssembler.toEntitiesFromResponse(response);
                requestsLoaded.value = true;
                orders.value = ordersFromRequests(requests.value);
                ordersLoaded.value = true;
            }).catch(error => {
                errors.value.push(error);
            }).finally(() => {
                loading.value = false;
            });
            return;
        }

        orderingApi.getOrders().then(response => {
            orders.value = OrderAssembler.toEntitiesFromResponse(response);
            ordersLoaded.value = true;
        }).catch(error => {
            if (!isMissingOrdersEndpoint(error)) {
                errors.value.push(error);
                return;
            }

            return orderingApi.getRequests().then(response => {
                requests.value = RequestAssembler.toEntitiesFromResponse(response);
                requestsLoaded.value = true;
                orders.value = ordersFromRequests(requests.value);
                ordersLoaded.value = true;
            }).catch(requestsError => {
                errors.value.push(requestsError);
            });
        }).finally(() => {
            loading.value = false;
        });
    }

    function getOrderById(id) {
        const idNum = parseInt(id);
        return orders.value.find(o => o.id === idNum || o.id === id);
    }

    function addOrder(order) {
        return orderingApi.createOrder(order).then(response => {
            const newOrder = OrderAssembler.toEntityFromResource(response.data);
            orders.value.push(newOrder);
            return newOrder;
        }).catch(error => {
            errors.value.push(error);
            return null;
        });
    }

    function updateOrder(order) {
        return orderingApi.updateOrder(order).then(response => {
            const updated = OrderAssembler.toEntityFromResource(response.data);
            const index = orders.value.findIndex(o => o.id === updated.id);
            if (index !== -1) orders.value[index] = updated;
            return updated;
        }).catch(error => {
            errors.value.push(error);
            return null;
        });
    }

    function deleteOrder(order) {
        if (!useOrdersEndpoint) {
            const index = orders.value.findIndex(o => o.id === order.id);
            if (index !== -1) orders.value.splice(index, 1);
            return;
        }

        orderingApi.deleteOrder(order.id).then(() => {
            const index = orders.value.findIndex(o => o.id === order.id);
            if (index !== -1) orders.value.splice(index, 1);
        }).catch(error => {
            if (isMissingOrdersEndpoint(error)) {
                const index = orders.value.findIndex(o => o.id === order.id);
                if (index !== -1) orders.value.splice(index, 1);
                return;
            }
            errors.value.push(error);
        });
    }

    // ── Segment-scoped read models ────────────────────────────────────────
    /** @param {number} companyId @returns {Request[]} */
    function requestsForBuyer(companyId) {
        return requests.value.filter(r => (r.companyId ?? r.clientId) === companyId);
    }
    /** @param {number} companyId @returns {Order[]} */
    function ordersForBuyer(companyId) {
        return orders.value.filter(o => (o.companyId ?? o.clientId) === companyId);
    }
    /** @param {number} providerId @returns {Request[]} */
    function requestsForProvider(providerId) {
        return requests.value.filter(r => r.providerId === providerId);
    }
    /** @param {number} providerId @returns {Order[]} */
    function ordersForProvider(providerId) {
        return orders.value.filter(o => o.providerId === providerId);
    }

    // ── Async actions used by the coordination service ────────────────────
    /**
     * Creates a request and returns the persisted entity (Promise-based).
     * @param {Object} payload
     * @returns {Promise<Request|null>}
     */
    async function createRequestAsync(payload) {
        const draft = new Request({ status: 'PENDING', createdAt: new Date().toISOString(), ...payload });
        try {
            const response = await orderingApi.createRequest(draft);
            const created = RequestAssembler.toEntityFromResource(response.data);
            requests.value.push(created);
            return created;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }


    /** @param {Request} request @returns {Promise<Request|null>} */
    async function updateRequestAsync(request) {
        try {
            const response = await orderingApi.updateRequest(request);
            const updated = RequestAssembler.toEntityFromResource(response.data);
            const index = requests.value.findIndex(r => r.id === updated.id);
            if (index !== -1) requests.value[index] = updated;
            return updated;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    /** @param {Order} order @returns {Promise<Order>} */
    async function createOrderAsync(order) {
        try {
            const response = await orderingApi.createOrder(order);
            const created = OrderAssembler.toEntityFromResource(response.data);
            orders.value.push(created);
            return created;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    /**
     * Approves a request via backend command and records the resulting order.
     * @param {Request|number|string} requestOrId
     * @returns {Promise<Order|null>}
     */
    async function approveRequestAsync(requestOrId) {
        const id = typeof requestOrId === 'object' && requestOrId !== null ? requestOrId.id : requestOrId;
        try {
            const response = await orderingApi.approveFuelRequest(id);
            const order = OrderAssembler.toEntityFromResource(response.data);
            const orderIndex = orders.value.findIndex(o => o.id === order.id);
            if (orderIndex !== -1) {
                orders.value[orderIndex] = order;
            } else {
                orders.value.push(order);
            }
            const reqIndex = requests.value.findIndex(r => r.id === id);
            if (reqIndex !== -1) {
                requests.value[reqIndex] = new Request({ ...requests.value[reqIndex], status: 'APPROVED' });
            }
            return order;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    /** @param {Request} request @param {string} [code='OTHER'] @param {string} [note=''] @returns {Promise<Request|null>} */
    async function rejectRequestAsync(request, code = 'OTHER', note = '') {
        return await updateRequestAsync(new Request({ ...request, status: 'REJECTED', rejectionReasonCode: code, rejectionReasonNote: note }));
    }

    /**
     * Dispatches an order via backend command (sets DISPATCHED + driver/vehicle).
     * @param {Order|number|string} orderOrId
     * @param {{ driverId:number, vehicleId:number }} assignment
     * @returns {Promise<Order|null>}
     */
    async function dispatchOrder(orderOrId, { driverId, vehicleId }) {
        const id = typeof orderOrId === 'object' && orderOrId !== null ? orderOrId.id : orderOrId;
        try {
            const response = await orderingApi.dispatchOrder(id, { driverId, vehicleId });
            const updated = OrderAssembler.toEntityFromResource(response.data);
            const index = orders.value.findIndex(o => o.id === updated.id);
            if (index !== -1) orders.value[index] = updated;
            return updated;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    /**
     * Updates an order's payment status.
     * @param {number|string} orderId
     * @param {string} status
     */
    function setOrderPaymentStatus(orderId, status) {
        const order = getOrderById(orderId);
        if (!order) return;
        const updated = new Order({ ...order, paymentStatus: status, updatedAt: new Date().toISOString() });
        updateOrder(updated);
    }

    /**
     * Buyer confirms reception of a dispatched order via backend command: moves it to
     * PENDING_PAYMENT and stamps the delivery time.
     * @param {Order|number|string} orderOrId
     * @returns {Promise<Order|null>}
     */
    async function confirmReception(orderOrId) {
        const id = typeof orderOrId === 'object' && orderOrId !== null ? orderOrId.id : orderOrId;
        try {
            const response = await orderingApi.receiveOrder(id);
            const updated = OrderAssembler.toEntityFromResource(response.data);
            const index = orders.value.findIndex(o => o.id === updated.id);
            if (index !== -1) orders.value[index] = updated;
            return updated;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    /**
     * Marks an order as fully paid (status + paymentStatus).
     * @param {number|string} orderId
     */
    async function markOrderPaid(orderId) {
        const order = getOrderById(orderId);
        if (!order) return;
        const now = new Date().toISOString();
        const updated = new Order({ ...order, status: 'PAID', paymentStatus: 'PAID', paidAt: now, updatedAt: now });
        return await updateOrder(updated);
    }

    function markOrderPaidLocally(orderId) {
        const order = getOrderById(orderId);
        if (!order) return null;
        const now = new Date().toISOString();
        const updated = new Order({ ...order, status: 'PAID', paymentStatus: 'PAID', paidAt: now, updatedAt: now });
        const index = orders.value.findIndex(item => item.id === updated.id);
        if (index !== -1) orders.value[index] = updated;
        return updated;
    }

    /**
     * Cancels an accepted order before dispatch via backend command.
     * @param {number|string} orderId
     * @param {string} [reason='']
     * @returns {Promise<Order|null>}
     */
    async function cancelOrder(orderOrId, reason = '') {
        const id = typeof orderOrId === 'object' && orderOrId !== null ? orderOrId.id : orderOrId;
        try {
            const response = await orderingApi.cancelOrder(id, reason);
            const updated = OrderAssembler.toEntityFromResource(response.data);
            const index = orders.value.findIndex(o => o.id === updated.id);
            if (index !== -1) orders.value[index] = updated;
            return updated;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    /**
     * Advances an order's delivery status (provider action).
     * @param {Order} order
     * @param {string} status - CREATED | DISPATCHED | DELIVERED | CLOSED
     */
    function changeOrderStatus(order, status) {
        const now = new Date().toISOString();
        const patch = { ...order, status, updatedAt: now };
        if (status === 'DISPATCHED') patch.dispatchedAt = patch.dispatchedAt ?? now;
        if (status === 'DELIVERED') patch.deliveredAt = now;
        if (status === 'CLOSED') patch.closedAt = now;
        updateOrder(new Order(patch));
    }

    function clearErrors() {
        errors.value = [];
    }

    return {
        // state
        requests, requestsLoaded,
        orders, ordersLoaded,
        loading, errors,
        // computed
        requestsCount,
        pendingRequests, approvedRequests,
        activeOrders, closedOrders,
        // read models
        requestsForBuyer, ordersForBuyer,
        requestsForProvider, ordersForProvider,
        // request actions
        fetchRequests, getRequestById,
        addRequest, updateRequest, deleteRequest,
        approveRequest, rejectRequest,
        createRequestAsync, updateRequestAsync,
        approveRequestAsync, rejectRequestAsync,
        // order actions
        fetchOrders, getOrderById,
        addOrder, updateOrder, deleteOrder,
        createOrderAsync, dispatchOrder,
        setOrderPaymentStatus, changeOrderStatus,
        confirmReception, markOrderPaid, markOrderPaidLocally, cancelOrder,
        clearErrors,
    };
});

export default useOrderingStore;
