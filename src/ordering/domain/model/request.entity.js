/**
 * Request entity in the Ordering bounded context.
 * Represents a fuel delivery request from a buyer company.
 *
 * @class Request
 */
export class Request {
    /**
     * @param {Object} params - Entity attributes.
     * @param {number|string|null} [params.id=null] - Request identifier.
     * @param {number|string|null} [params.clientId=null] - Legacy buyer reference.
     * @param {number|string|null} [params.companyId=null] - Buyer company id.
     * @param {number|string|null} [params.providerId=null] - Target provider.
     * @param {number|string|null} [params.equipmentId=null] - Source equipment (optional).
     * @param {string} [params.fuelType=''] - Type of fuel requested.
     * @param {string} [params.productName=''] - Provider product name.
     * @param {number} [params.quantity=0] - Quantity requested.
     * @param {string} [params.unit='GALLONS'] - Unit of measurement.
     * @param {number} [params.unitPrice=0] - Price per unit at request time.
     * @param {string} [params.deliveryAddress=''] - Delivery location.
     * @param {string} [params.deliveryDate=''] - Requested delivery date.
     * @param {string} [params.status='PENDING'] - Request status.
     * @param {string} [params.source='MANUAL'] - MANUAL | AUTO_REFILL.
     * @param {string} [params.rejectionReasonCode=''] - Reason code when rejected (NO_STOCK, OUT_OF_ZONE, DATE, QUANTITY, OTHER).
     * @param {string} [params.rejectionReasonNote=''] - Optional free-text note for the rejection.
     * @param {string|null} [params.createdAt=null] - Creation timestamp.
     */
    constructor({
                    id = null,
                    clientId = null,
                    companyId = null,
                    providerId = null,
                    equipmentId = null,
                    fuelType = '',
                    productName = '',
                    quantity = 0,
                    unit = 'GALLONS',
                    unitPrice = 0,
                    deliveryAddress = '',
                    deliveryDate = '',
                    status = 'PENDING',
                    source = 'MANUAL',
                    rejectionReasonCode = '',
                    rejectionReasonNote = '',
                    createdAt = null
                }) {
        this.id = id;
        this.clientId = clientId ?? companyId;
        this.companyId = companyId ?? clientId;
        this.providerId = providerId;
        this.equipmentId = equipmentId;
        this.fuelType = fuelType;
        this.productName = productName;
        this.quantity = quantity;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.deliveryAddress = deliveryAddress;
        this.deliveryDate = deliveryDate;
        this.status = status;
        this.source = source;
        this.rejectionReasonCode = rejectionReasonCode;
        this.rejectionReasonNote = rejectionReasonNote;
        this.createdAt = createdAt;
    }
}
