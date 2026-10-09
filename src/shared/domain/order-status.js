/**
 * Normalized order lifecycle shared across bounded contexts.
 *
 * Flow: ACCEPTED → DISPATCHED → PENDING_PAYMENT → PAID → CLOSED
 *  - ACCEPTED        provider accepted the request; order created.
 *  - DISPATCHED      provider assigned driver + vehicle; stock reduced; en route.
 *  - PENDING_PAYMENT buyer confirmed reception; equipment refilled; awaiting payment.
 *  - PAID            buyer paid; invoice generated.
 *  - CLOSED          archived (optional terminal state).
 *
 * @module order-status
 */

export const ORDER_STATUS = Object.freeze({
    ACCEPTED: 'ACCEPTED',
    DISPATCHED: 'DISPATCHED',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PAID: 'PAID',
    CLOSED: 'CLOSED',
});

/**
 * PrimeVue tag severity for an order status.
 * @param {string} status
 * @returns {string}
 */
export function orderStatusSeverity(status) {
    return {
        ACCEPTED: 'info',
        DISPATCHED: 'warn',
        PENDING_PAYMENT: 'contrast',
        PAID: 'success',
        CLOSED: 'secondary',
        REJECTED: 'danger',
        CANCELLED: 'danger',
    }[status] ?? 'secondary';
}

/**
 * i18n key for an order status label.
 * @param {string} status
 * @returns {string}
 */
export function orderStatusKey(status) {
    return `ordering.status-${status}`;
}
