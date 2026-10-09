/**
 * Axios adapter that emulates the FullTank REST API in memory.
 *
 * Only used for the demo build (`VITE_USE_FAKE_API=true`). It implements the
 * generic CRUD contract of `BaseEndpoint` plus every custom command the UI
 * relies on (auth, approve/dispatch/receive/cancel, deliveries, notifications,
 * payment checkout and analytics). Unknown routes reject with 404 so gaps are
 * visible in the console during verification.
 */
import {
    addExtraCompany,
    buyerCompanies,
    buyerName,
    buyerSector,
    collection,
    collectionByPath,
    findById,
    findExtraCompany,
    nextCompanyId,
    nextId,
    nowIso,
    providerCompanies,
    providerName,
    removeById,
} from './fake-database.js';

const MONTH_LABELS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACTIVE_ORDER_STATUSES = ['CREATED', 'ACCEPTED', 'DISPATCHED'];

function ok(config, data, status = 200) {
    return {
        data,
        status,
        statusText: status === 200 ? 'OK' : 'Created',
        headers: {},
        config,
    };
}

function fail(config, status, message) {
    return Promise.reject({
        message: `Fake API ${status}: ${message}`,
        isAxiosError: true,
        config,
        response: {
            data: { message },
            status,
            statusText: 'Error',
            headers: {},
            config,
        },
    });
}

function bodyOf(config) {
    const data = config?.data;
    if (data == null || data === '') return {};
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function collectionMatches(items, params) {
    const entries = Object.entries(params ?? {}).filter(([, value]) => value !== undefined);
    if (!entries.length) return items;
    return items.filter(item =>
        entries.every(([key, value]) => String(item?.[key]) === String(value)),
    );
}

function withoutPassword(user) {
    if (!user) return user;
    const { password: _password, ...safe } = user;
    // The seed users carry no companyId, but the UI re-reads the user
    // resource on boot (fetchCurrentUser) and treats a missing companyId as
    // "no company". Default it like sign-in does so the session survives.
    if (safe.companyId == null) safe.companyId = safe.id;
    return safe;
}

function orderCompanyId(order) {
    return order?.companyId ?? order?.clientId ?? order?.buyerCompanyId ?? null;
}

function isPaidOrder(order) {
    return order?.paymentStatus === 'PAID' || order?.status === 'PAID' || order?.status === 'CLOSED';
}

function financialDate(order) {
    const value = order?.paidAt ?? order?.closedAt ?? order?.updatedAt ?? order?.createdAt;
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function buyerOrders(companyId) {
    return collection('orders').filter(
        order => String(orderCompanyId(order)) === String(companyId),
    );
}

function providerOrders(providerId) {
    return collection('orders').filter(
        order => String(order?.providerId) === String(providerId),
    );
}

function paidOrdersOf(orders) {
    return orders.filter(isPaidOrder);
}

function monthlyTotals(orders) {
    const totals = new Array(12).fill(0);
    paidOrdersOf(orders).forEach(order => {
        const date = financialDate(order);
        if (!date) return;
        totals[date.getMonth()] += Number(order.totalAmount || 0);
    });
    return totals;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function signIn(config) {
    const { email = '', password = '' } = bodyOf(config);
    const user = collection('users').find(
        candidate => String(candidate?.email ?? '').toLowerCase() === String(email).toLowerCase(),
    );
    if (!user || user.password !== password) {
        return fail(config, 401, 'Invalid credentials');
    }
    return Promise.resolve(ok(config, {
        id: user.id,
        companyId: user.companyId ?? user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: `fake-jwt-${user.id}-${Date.now()}`,
    }));
}

function signUp(config) {
    const payload = bodyOf(config);
    const email = String(payload.email ?? '').toLowerCase();
    if (!email) return fail(config, 400, 'Email is required');
    const exists = collection('users').some(
        candidate => String(candidate?.email ?? '').toLowerCase() === email,
    );
    if (exists) return fail(config, 409, 'Email already registered');
    const user = {
        id: nextId('users'),
        name: payload.name ?? payload.email,
        email: payload.email,
        password: payload.password ?? '',
        role: payload.role ?? 'BUYER',
        companyId: payload.companyId ?? null,
    };
    collection('users').push(user);
    return Promise.resolve(ok(config, withoutPassword(user), 201));
}

function updateUserProfile(config, id) {
    const payload = bodyOf(config);
    const user = findById('users', id);
    if (!user) return fail(config, 404, 'User not found');
    if (payload.email) {
        const taken = collection('users').some(
            candidate => String(candidate?.id) !== String(id)
                && String(candidate?.email ?? '').toLowerCase() === String(payload.email).toLowerCase(),
        );
        if (taken) return fail(config, 409, 'Email already in use');
    }
    if (payload.name !== undefined) user.name = payload.name;
    if (payload.email !== undefined) user.email = payload.email;
    return Promise.resolve(ok(config, withoutPassword({ ...user })));
}

function changePassword(config, id) {
    const { currentPassword, newPassword } = bodyOf(config);
    const user = findById('users', id);
    if (!user) return fail(config, 404, 'User not found');
    if (user.password !== currentPassword) {
        return fail(config, 401, 'Current password is invalid');
    }
    user.password = newPassword;
    return Promise.resolve(ok(config, {}));
}

// ---------------------------------------------------------------------------
// Company directories (derived from users)
// ---------------------------------------------------------------------------

function directoryAll(config, kind) {
    const items = kind === 'buyer' ? buyerCompanies() : providerCompanies();
    return Promise.resolve(ok(config, collectionMatches(items, config?.params)));
}

function directoryById(config, kind, id) {
    const items = kind === 'buyer' ? buyerCompanies() : providerCompanies();
    const found = items.find(company => String(company?.id) === String(id));
    if (!found) return fail(config, 404, 'Company not found');
    return Promise.resolve(ok(config, found));
}

function directoryCreate(config, kind) {
    const payload = bodyOf(config);
    // Mirrors the backend: creating a company mints the directory record and a
    // registration token. The user account itself is created later via sign-up,
    // so no user is provisioned here (that would collide on email).
    const company = {
        id: nextCompanyId(),
        name: payload.name ?? 'New company',
        ruc: payload.ruc ?? '',
        sector: payload.sector ?? '',
        address: payload.address ?? '',
        contactEmail: payload.contactEmail ?? payload.email ?? '',
        phone: payload.phone ?? '',
        rating: payload.rating ?? 0,
        fuelTypesOffered: payload.fuelTypesOffered ?? [],
        description: payload.description ?? '',
        registrationToken: `demo-reg-${Date.now()}`,
    };
    addExtraCompany(kind, company);
    return Promise.resolve(ok(config, { ...company }, 201));
}

function directoryUpdate(config, kind, id) {
    const payload = bodyOf(config);
    const extra = findExtraCompany(kind, id);
    if (extra) {
        Object.assign(extra, payload, { id: extra.id });
        return Promise.resolve(ok(config, { ...extra }));
    }
    const user = findById('users', id);
    if (!user) return fail(config, 404, 'Company not found');
    ['name', 'ruc', 'sector', 'address', 'phone', 'description'].forEach(field => {
        if (payload[field] !== undefined) user[field] = payload[field];
    });
    if (payload.contactEmail !== undefined) user.email = payload.contactEmail;
    if (payload.fuelTypesOffered !== undefined) user.fuelTypesOffered = payload.fuelTypesOffered;
    const updated = (kind === 'buyer' ? buyerCompanies() : providerCompanies())
        .find(company => String(company.id) === String(id));
    return Promise.resolve(ok(config, updated));
}

// ---------------------------------------------------------------------------
// Ordering commands
// ---------------------------------------------------------------------------

function approveRequest(config, id) {
    const request = findById('requests', id);
    if (!request) return fail(config, 404, 'Request not found');
    request.status = 'APPROVED';
    const companyId = request.companyId ?? request.clientId ?? request.buyerCompanyId ?? null;
    const quantity = Number(request.quantity || 0);
    const unitPrice = Number(request.unitPrice || 0);
    const order = {
        id: nextId('orders'),
        requestId: request.id,
        clientId: companyId,
        companyId,
        buyerCompanyId: request.buyerCompanyId ?? companyId,
        providerId: request.providerId,
        equipmentId: request.equipmentId ?? null,
        fuelType: request.fuelType,
        productName: request.productName ?? '',
        quantity: request.quantity,
        unit: request.unit,
        unitPrice: request.unitPrice,
        totalAmount: quantity * unitPrice,
        deliveryAddress: request.deliveryAddress ?? '',
        status: 'CREATED',
        paymentStatus: 'PENDING',
        driverId: null,
        vehicleId: null,
        estimatedDeliveryDate: request.deliveryDate ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };
    collection('orders').push(order);
    return Promise.resolve(ok(config, { ...order }));
}

function dispatchOrder(config, id) {
    const { driverId, vehicleId } = bodyOf(config);
    const order = findById('orders', id);
    if (!order) return fail(config, 404, 'Order not found');
    order.driverId = driverId ?? order.driverId;
    order.vehicleId = vehicleId ?? order.vehicleId;
    order.status = 'DISPATCHED';
    order.dispatchedAt = nowIso();
    order.updatedAt = nowIso();
    return Promise.resolve(ok(config, { ...order }));
}

function receiveOrder(config, id) {
    const order = findById('orders', id);
    if (!order) return fail(config, 404, 'Order not found');
    order.status = 'DELIVERED';
    order.deliveredAt = nowIso();
    order.updatedAt = nowIso();
    return Promise.resolve(ok(config, { ...order }));
}

function cancelOrder(config, id) {
    const { reason = '' } = bodyOf(config);
    const order = findById('orders', id);
    if (!order) return fail(config, 404, 'Order not found');
    order.status = 'CANCELLED';
    order.cancelReason = reason;
    order.cancelledAt = nowIso();
    order.updatedAt = nowIso();
    return Promise.resolve(ok(config, { ...order }));
}

function completeDelivery(config, id) {
    const delivery = findById('deliveries', id);
    if (!delivery) return fail(config, 404, 'Delivery not found');
    delivery.status = 'delivered';
    delivery.deliveredAt = nowIso();
    return Promise.resolve(ok(config, { ...delivery }));
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

function markNotificationRead(config, id) {
    const notification = findById('notifications', id);
    if (!notification) return fail(config, 404, 'Notification not found');
    notification.read = true;
    notification.isRead = true;
    return Promise.resolve(ok(config, { ...notification }));
}

function markNotificationsReadAll(config, scope, id) {
    const keys = scope === 'buyer' ? ['companyId', 'buyerCompanyId'] : ['providerId'];
    collection('notifications')
        .filter(notification => keys.some(key => String(notification?.[key]) === String(id)))
        .forEach(notification => {
            notification.read = true;
            notification.isRead = true;
        });
    return Promise.resolve(ok(config, {}));
}

// ---------------------------------------------------------------------------
// Payment checkout
// ---------------------------------------------------------------------------

function checkout(config) {
    const { payment = {}, invoice = {} } = bodyOf(config);
    const paymentId = nextId('payments');
    const createdPayment = {
        ...payment,
        id: paymentId,
        status: 'COMPLETED',
        createdAt: nowIso(),
    };
    if (!createdPayment.reference) {
        const stamp = nowIso().slice(0, 10).replaceAll('-', '');
        createdPayment.reference = `TXN-${stamp}-${String(paymentId).padStart(4, '0')}`;
    }
    collection('payments').push(createdPayment);
    const invoiceId = nextId('invoices');
    const createdInvoice = {
        ...invoice,
        id: invoiceId,
        paymentId: createdPayment.id,
        orderId: createdPayment.orderId ?? payment.orderId ?? null,
        status: 'PAID',
        issueDate: nowIso(),
    };
    if (!createdInvoice.invoiceNumber) {
        createdInvoice.invoiceNumber = `F001-${String(invoiceId).padStart(6, '0')}`;
    }
    collection('invoices').push(createdInvoice);
    return Promise.resolve(ok(config, {
        payment: { ...createdPayment },
        invoice: { ...createdInvoice },
    }));
}

// ---------------------------------------------------------------------------
// Analytics (computed from the in-memory collections)
// ---------------------------------------------------------------------------

function buyerDashboard(config, companyId) {
    const orders = buyerOrders(companyId);
    const paid = paidOrdersOf(orders);
    const totals = monthlyTotals(orders);
    const now = new Date();
    const spendingTrend = [];
    for (let back = 5; back >= 0; back -= 1) {
        const cursor = new Date(now.getFullYear(), now.getMonth() - back, 1);
        spendingTrend.push({
            label: SHORT_MONTHS[cursor.getMonth()],
            amount: totals[cursor.getMonth()],
        });
    }
    const needsRefill = collection('equipment').filter(item => {
        if (String(item?.companyId) !== String(companyId)) return false;
        const capacity = Number(item.capacity || 0);
        if (!capacity) return false;
        const ratio = Number(item.currentLevel || 0) / capacity;
        return ratio * 100 < Number(item.refillThreshold ?? 25);
    }).length;
    return Promise.resolve(ok(config, {
        activeOrders: orders.filter(order => ACTIVE_ORDER_STATUSES.includes(order.status)).length,
        pendingPayments: orders.filter(order => ['PENDING', 'PENDING_PAYMENT'].includes(order.paymentStatus)).length,
        needsRefill,
        totalSpent: paid.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
        spendingTrend,
    }));
}

function providerDashboard(config, providerId) {
    const orders = providerOrders(providerId);
    const pendingRequests = collection('requests').filter(
        request => String(request?.providerId) === String(providerId) && request?.status === 'PENDING',
    ).length;
    return Promise.resolve(ok(config, {
        activeOrders: orders.filter(order => ACTIVE_ORDER_STATUSES.includes(order.status)).length,
        pendingRequests,
    }));
}

function buyerSummary(config, companyId) {
    const paid = paidOrdersOf(buyerOrders(companyId));
    const totalSpent = paid.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    return Promise.resolve(ok(config, {
        totalSpent,
        totalOrders: paid.length,
        averageOrderValue: paid.length ? totalSpent / paid.length : 0,
    }));
}

function buyerMonthlySpending(config, companyId) {
    const totals = monthlyTotals(buyerOrders(companyId));
    return Promise.resolve(ok(config, MONTH_LABELS.map((month, index) => ({
        month,
        amount: totals[index],
    }))));
}

function buyerSpendingByProvider(config, companyId) {
    const byProvider = {};
    paidOrdersOf(buyerOrders(companyId)).forEach(order => {
        const key = String(order.providerId ?? 'unknown');
        byProvider[key] = (byProvider[key] ?? 0) + Number(order.totalAmount || 0);
    });
    return Promise.resolve(ok(config, Object.entries(byProvider).map(([id, amount]) => ({
        providerId: id,
        providerName: providerName(id),
        amount,
    }))));
}

function buyerSpendingByFuelType(config, companyId) {
    const byFuel = {};
    paidOrdersOf(buyerOrders(companyId)).forEach(order => {
        const key = order.fuelType ?? 'UNKNOWN';
        byFuel[key] = (byFuel[key] ?? 0) + Number(order.totalAmount || 0);
    });
    return Promise.resolve(ok(config, Object.entries(byFuel).map(([fuelType, amount]) => ({
        fuelType,
        amount,
    }))));
}

function buyerSpendingByEquipment(config, companyId) {
    const byEquipment = {};
    paidOrdersOf(buyerOrders(companyId)).forEach(order => {
        if (order.equipmentId == null) return;
        const key = String(order.equipmentId);
        byEquipment[key] = (byEquipment[key] ?? 0) + Number(order.totalAmount || 0);
    });
    return Promise.resolve(ok(config, Object.entries(byEquipment).map(([equipmentId, amount]) => ({
        equipmentId: Number(equipmentId),
        amount,
    }))));
}

function providerSalesSummary(config, providerId) {
    const paid = paidOrdersOf(providerOrders(providerId));
    const totalRevenue = paid.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    return Promise.resolve(ok(config, {
        totalRevenue,
        totalOrders: paid.length,
        averageOrderValue: paid.length ? totalRevenue / paid.length : 0,
    }));
}

function providerRevenueOverTime(config, providerId) {
    const totals = monthlyTotals(providerOrders(providerId));
    return Promise.resolve(ok(config, MONTH_LABELS.map((month, index) => ({
        label: month.slice(0, 3),
        month,
        amount: totals[index],
    }))));
}

function providerRevenueByFuelType(config, providerId) {
    const byFuel = {};
    paidOrdersOf(providerOrders(providerId)).forEach(order => {
        const key = order.fuelType ?? 'UNKNOWN';
        byFuel[key] = (byFuel[key] ?? 0) + Number(order.totalAmount || 0);
    });
    return Promise.resolve(ok(config, Object.entries(byFuel).map(([fuelType, revenue]) => ({
        fuelType,
        revenue,
    }))));
}

function providerOrdersByStatus(config, providerId) {
    const byStatus = {};
    providerOrders(providerId).forEach(order => {
        const key = order.status ?? 'UNKNOWN';
        byStatus[key] = (byStatus[key] ?? 0) + 1;
    });
    return Promise.resolve(ok(config, Object.entries(byStatus).map(([status, count]) => ({
        status,
        count,
    }))));
}

function providerCustomersBySector(config, providerId) {
    const sectors = {};
    providerOrders(providerId).forEach(order => {
        const sector = buyerSector(orderCompanyId(order));
        if (!sectors[sector]) sectors[sector] = new Set();
        sectors[sector].add(String(orderCompanyId(order)));
    });
    return Promise.resolve(ok(config, Object.entries(sectors).map(([sector, ids]) => ({
        sector,
        count: ids.size,
    }))));
}

function providerTopCustomers(config, providerId) {
    const totals = {};
    paidOrdersOf(providerOrders(providerId)).forEach(order => {
        const key = String(orderCompanyId(order));
        totals[key] = (totals[key] ?? 0) + Number(order.totalAmount || 0);
    });
    const top = Object.entries(totals)
        .map(([companyId, totalPurchased]) => ({
            companyId: Number(companyId),
            companyName: buyerName(companyId),
            totalPurchased,
        }))
        .sort((a, b) => b.totalPurchased - a.totalPurchased)
        .slice(0, 5);
    return Promise.resolve(ok(config, top));
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function splitPath(url) {
    return String(url ?? '').replace(/^\/+/, '').split('/').filter(Boolean);
}

function route(config) {
    const method = String(config?.method ?? 'get').toLowerCase();
    const parts = splitPath(config?.url);

    // Authentication ---------------------------------------------------------
    if (parts[0] === 'authentication' && parts[1] === 'sign-in' && method === 'post') {
        return signIn(config);
    }
    if (parts[0] === 'authentication' && parts[1] === 'sign-up' && method === 'post') {
        return signUp(config);
    }

    // Company directories ------------------------------------------------------
    if ((parts[0] === 'buyer-companies' || parts[0] === 'provider-companies') && parts.length <= 2) {
        const kind = parts[0] === 'buyer-companies' ? 'buyer' : 'provider';
        if (method === 'get' && parts.length === 1) return directoryAll(config, kind);
        if (method === 'post' && parts.length === 1) return directoryCreate(config, kind);
        if (method === 'get' && parts.length === 2) return directoryById(config, kind, parts[1]);
        if (method === 'put' && parts.length === 2) return directoryUpdate(config, kind, parts[1]);
    }

    // User profile / password ---------------------------------------------------
    if (parts[0] === 'users' && parts.length === 3 && parts[2] === 'profile' && method === 'put') {
        return updateUserProfile(config, parts[1]);
    }
    if (parts[0] === 'users' && parts.length === 3 && parts[2] === 'password' && method === 'put') {
        return changePassword(config, parts[1]);
    }

    // Ordering commands ----------------------------------------------------------
    if (parts[0] === 'fuel-requests' && parts.length === 3 && parts[2] === 'approve' && method === 'post') {
        return approveRequest(config, parts[1]);
    }
    if (parts[0] === 'orders' && parts.length === 3 && method === 'post') {
        if (parts[2] === 'dispatch') return dispatchOrder(config, parts[1]);
        if (parts[2] === 'receive') return receiveOrder(config, parts[1]);
        if (parts[2] === 'cancel') return cancelOrder(config, parts[1]);
    }
    if (parts[0] === 'deliveries' && parts.length === 3 && parts[2] === 'complete' && method === 'post') {
        return completeDelivery(config, parts[1]);
    }

    // Notifications ---------------------------------------------------------------
    if (parts[0] === 'notifications' && parts.length === 3 && parts[2] === 'read' && method === 'post') {
        return markNotificationRead(config, parts[1]);
    }
    if (parts[0] === 'notifications' && parts.length === 4 && parts[3] === 'read-all' && method === 'post') {
        return markNotificationsReadAll(config, parts[1], parts[2]);
    }

    // Payment checkout ---------------------------------------------------------------
    if (parts[0] === 'payment-checkout' && method === 'post') {
        return checkout(config);
    }

    // Analytics -------------------------------------------------------------------------
    if (parts[0] === 'analytics' && parts[1] === 'buyer-dashboard' && parts[2] && method === 'get') {
        return buyerDashboard(config, parts[2]);
    }
    if (parts[0] === 'analytics' && parts[1] === 'provider-dashboard' && parts[2] && method === 'get') {
        return providerDashboard(config, parts[2]);
    }
    if (parts[0] === 'analytics' && parts[1] === 'buyer' && parts[3] && method === 'get') {
        const report = parts[3];
        if (report === 'spending-summary') return buyerSummary(config, parts[2]);
        if (report === 'monthly-spending') return buyerMonthlySpending(config, parts[2]);
        if (report === 'spending-by-provider') return buyerSpendingByProvider(config, parts[2]);
        if (report === 'spending-by-fuel-type') return buyerSpendingByFuelType(config, parts[2]);
        if (report === 'spending-by-equipment') return buyerSpendingByEquipment(config, parts[2]);
    }
    if (parts[0] === 'analytics' && parts[1] === 'provider' && parts[3] && method === 'get') {
        const report = parts[3];
        if (report === 'sales-summary') return providerSalesSummary(config, parts[2]);
        if (report === 'revenue-over-time') return providerRevenueOverTime(config, parts[2]);
        if (report === 'revenue-by-fuel-type') return providerRevenueByFuelType(config, parts[2]);
        if (report === 'orders-by-status') return providerOrdersByStatus(config, parts[2]);
        if (report === 'customers-by-sector') return providerCustomersBySector(config, parts[2]);
        if (report === 'top-customers') return providerTopCustomers(config, parts[2]);
    }

    // Fulfillment scoped collections -------------------------------------------
    if ((parts[0] === 'vehicles' || parts[0] === 'drivers')
        && parts[1] === 'provider' && parts[2] && method === 'get') {
        const items = collection(parts[0]).filter(
            item => String(item?.providerId) === String(parts[2]),
        );
        return Promise.resolve(ok(config, items));
    }

    // Generic CRUD --------------------------------------------------------------------------
    const key = collectionByPath[parts[0]];
    if (key && parts.length <= 2) {
        if (method === 'get' && parts.length === 1) {
            const items = collection(key).map(item => item);
            if (key === 'users') {
                return Promise.resolve(ok(config, collectionMatches(items.map(withoutPassword), config?.params)));
            }
            return Promise.resolve(ok(config, collectionMatches(items, config?.params)));
        }
        if (method === 'post' && parts.length === 1) {
            const payload = bodyOf(config);
            const created = { ...payload, id: payload.id ?? nextId(key) };
            if (key === 'notifications' && created.createdAt == null) created.createdAt = nowIso();
            if (created.createdAt === undefined && (key === 'orders' || key === 'requests')) {
                created.createdAt = nowIso();
            }
            collection(key).push(created);
            return Promise.resolve(ok(config, key === 'users' ? withoutPassword({ ...created }) : { ...created }, 201));
        }
        if (method === 'get' && parts.length === 2) {
            const found = findById(key, parts[1]);
            if (!found) return fail(config, 404, `${parts[0]} #${parts[1]} not found`);
            return Promise.resolve(ok(config, key === 'users' ? withoutPassword({ ...found }) : { ...found }));
        }
        if ((method === 'put' || method === 'patch') && parts.length === 2) {
            const found = findById(key, parts[1]);
            if (!found) return fail(config, 404, `${parts[0]} #${parts[1]} not found`);
            Object.assign(found, bodyOf(config), { id: found.id });
            return Promise.resolve(ok(config, key === 'users' ? withoutPassword({ ...found }) : { ...found }));
        }
        if (method === 'delete' && parts.length === 2) {
            const removed = removeById(key, parts[1]);
            if (!removed) return fail(config, 404, `${parts[0]} #${parts[1]} not found`);
            return Promise.resolve(ok(config, {}));
        }
    }

    // eslint-disable-next-line no-console
    console.warn(`[fake-api] Unhandled request: ${method.toUpperCase()} ${config?.url}`, bodyOf(config));
    return fail(config, 404, `No fake handler for ${method.toUpperCase()} ${config?.url}`);
}

/**
 * Creates an axios-compatible adapter backed by the in-memory fake database.
 * @param {{ latencyMs?: number }} [options]
 * @returns {import('axios').AxiosAdapter}
 */
export function createFakeAdapter(options = {}) {
    const latencyMs = options.latencyMs ?? 200;
    return async config => {
        if (latencyMs > 0) {
            await new Promise(resolve => setTimeout(resolve, latencyMs));
        }
        return route(config);
    };
}
