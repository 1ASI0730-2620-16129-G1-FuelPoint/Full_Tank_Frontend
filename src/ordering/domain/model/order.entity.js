/**
 * Order entity in the Ordering bounded context.
 * Created from an accepted Request.
 * Lifecycle: ACCEPTED → DISPATCHED → PENDING_PAYMENT → PAID → CLOSED.
 *
 * @class Order
 */
export class Order {
    /**
     * @param {Object} params
     * @param {number|string|null} [params.id=null]
     * @param {number|string|null} [params.requestId=null]
     * @param {number|string|null} [params.clientId=null]
     * @param {number|string|null} [params.companyId=null] - Buyer company id.
     * @param {number|string|null} [params.equipmentId=null] - Source equipment (optional).
     * @param {number|string|null} [params.providerId=null]
     * @param {string} [params.fuelType='']
     * @param {number} [params.quantity=0]
     * @param {string} [params.unit='GALLONS']
     * @param {number} [params.unitPrice=0]
     * @param {number} [params.totalAmount=0]
     * @param {string} [params.deliveryAddress='']
     * @param {string} [params.status='CREATED']
     * @param {string} [params.paymentStatus='PENDING'] - PENDING | PAID.
     * @param {number|null} [params.driverId=null]
     * @param {number|null} [params.vehicleId=null]
     * @param {string|null} [params.estimatedDeliveryDate=null]
     * @param {string|null} [params.dispatchedAt=null]
     * @param {string|null} [params.deliveredAt=null]
     * @param {string|null} [params.paidAt=null]
     * @param {string|null} [params.closedAt=null]
     * @param {string|null} [params.createdAt=null]
     * @param {string|null} [params.updatedAt=null]
     */
    constructor({
                    id = null,
                    requestId = null,
                    clientId = null,
                    companyId = null,
                    equipmentId = null,
                    providerId = null,
                    fuelType = '',
                    quantity = 0,
                    unit = 'GALLONS',
                    unitPrice = 0,
                    totalAmount = 0,
                    deliveryAddress = '',
                    status = 'ACCEPTED',
                    paymentStatus = 'PENDING',
                    driverId = null,
                    vehicleId = null,
                    estimatedDeliveryDate = null,
                    dispatchedAt = null,
                    deliveredAt = null,
                    paidAt = null,
                    closedAt = null,
                    cancelledAt = null,
                    cancelReason = '',
                    createdAt = null,
                    updatedAt = null,
                } = {}) {
        this.id = id;
        this.requestId = requestId;
        this.clientId = clientId ?? companyId;
        this.companyId = companyId ?? clientId;
        this.equipmentId = equipmentId;
        this.providerId = providerId;
        this.fuelType = fuelType;
        this.quantity = quantity;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.totalAmount = totalAmount;
        this.deliveryAddress = deliveryAddress;
        this.status = status;
        this.paymentStatus = paymentStatus;
        this.driverId = driverId;
        this.vehicleId = vehicleId;
        this.estimatedDeliveryDate = estimatedDeliveryDate;
        this.dispatchedAt = dispatchedAt;
        this.deliveredAt = deliveredAt;
        this.paidAt = paidAt;
        this.closedAt = closedAt;
        this.cancelledAt = cancelledAt;
        this.cancelReason = cancelReason;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
