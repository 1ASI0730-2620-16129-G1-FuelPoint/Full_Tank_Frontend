/**
 * Invoice entity in the Payment bounded context.
 * Auto-generated when a payment is completed. Mirrors a Peruvian invoice with
 * provider/buyer RUC, IGV (18%) and totals.
 *
 * @class Invoice
 */
export class Invoice {
    /**
     * @param {Object} params
     * @param {number|string|null} [params.id=null]
     * @param {number|null} [params.paymentId=null]
     * @param {number|null} [params.orderId=null]
     * @param {string} [params.invoiceNumber='']
     * @param {string} [params.providerRuc='']
     * @param {string} [params.providerName='']
     * @param {string} [params.buyerRuc='']
     * @param {string} [params.buyerName='']
     * @param {string} [params.fuelType='']
     * @param {number} [params.quantity=0]
     * @param {string} [params.unit='GALLONS']
     * @param {number} [params.unitPrice=0]
     * @param {number} [params.subtotal=0]
     * @param {number} [params.igv=0]
     * @param {number} [params.total=0]
     * @param {string|null} [params.issueDate=null]
     * @param {string} [params.status='PAID']
     */
    constructor({
                    id = null,
                    paymentId = null,
                    orderId = null,
                    invoiceNumber = '',
                    providerRuc = '',
                    providerName = '',
                    buyerRuc = '',
                    buyerName = '',
                    fuelType = '',
                    quantity = 0,
                    unit = 'GALLONS',
                    unitPrice = 0,
                    subtotal = 0,
                    igv = 0,
                    total = 0,
                    issueDate = null,
                    status = 'PAID',
                } = {}) {
        this.id = id;
        this.paymentId = paymentId;
        this.orderId = orderId;
        this.invoiceNumber = invoiceNumber;
        this.providerRuc = providerRuc;
        this.providerName = providerName;
        this.buyerRuc = buyerRuc;
        this.buyerName = buyerName;
        this.fuelType = fuelType;
        this.quantity = quantity;
        this.unit = unit;
        this.unitPrice = unitPrice;
        this.subtotal = subtotal;
        this.igv = igv;
        this.total = total;
        this.issueDate = issueDate;
        this.status = status;
    }
}
