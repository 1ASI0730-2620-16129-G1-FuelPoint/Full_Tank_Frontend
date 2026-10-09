/**
 * Payment entity in the Payment bounded context (buyer only).
 * Represents a *simulated* payment for a delivered order. No real gateway,
 * no real card data — only demo/fake values are ever stored.
 *
 * @class Payment
 */
export class Payment {
    /**
     * @param {Object} params
     * @param {number|string|null} [params.id=null]
     * @param {number|null} [params.orderId=null]
     * @param {number|null} [params.companyId=null] - Buyer company.
     * @param {number|null} [params.providerId=null]
     * @param {string} [params.method='CARD'] - CARD | YAPE.
     * @param {number} [params.amount=0]
     * @param {string} [params.status='COMPLETED']
     * @param {string} [params.maskedCard=''] - Masked, fake card number.
     * @param {string} [params.cardHolder='']
     * @param {string} [params.reference=''] - Simulated transaction reference.
     * @param {string|null} [params.createdAt=null]
     */
    constructor({
                    id = null,
                    orderId = null,
                    companyId = null,
                    providerId = null,
                    method = 'CARD',
                    amount = 0,
                    status = 'COMPLETED',
                    maskedCard = '',
                    cardHolder = '',
                    reference = '',
                    createdAt = null,
                } = {}) {
        this.id = id;
        this.orderId = orderId;
        this.companyId = companyId;
        this.providerId = providerId;
        this.method = method;
        this.amount = amount;
        this.status = status;
        this.maskedCard = maskedCard;
        this.cardHolder = cardHolder;
        this.reference = reference;
        this.createdAt = createdAt;
    }
}
