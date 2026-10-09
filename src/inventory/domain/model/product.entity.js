/**
 * Inventory item entity in the Inventory bounded context (provider only).
 * Represents a fuel storage tank with its stock level and capacity.
 *
 * @class Product
 */
export class Product {
    /**
     * @param {Object} params - Entity attributes.
     * @param {number|string|null} [params.id=null] - Item identifier.
     * @param {number|null} [params.providerId=null] - Owning provider.
     * @param {string} [params.name=''] - Tank / item name.
     * @param {string} [params.type=''] - Fuel type (e.g. GASOLINE_90, DIESEL_B5).
     * @param {string} [params.description=''] - Description.
     * @param {number} [params.pricePerLiter=0] - Price per unit.
     * @param {number} [params.stock=0] - Current physical stock.
     * @param {number} [params.reserved=0] - Stock committed to accepted-but-not-yet-dispatched orders.
     * @param {number} [params.capacity=0] - Total tank capacity.
     * @param {number} [params.lowStockThreshold=0] - Low-stock alert threshold.
     * @param {string} [params.unit='LITERS'] - Measurement unit.
     * @param {string} [params.status='ACTIVE'] - ACTIVE | DISABLED.
     */
    constructor({
                    id = null,
                    providerId = null,
                    name = '',
                    type = '',
                    description = '',
                    pricePerLiter = 0,
                    stock = 0,
                    reserved = 0,
                    capacity = 0,
                    lowStockThreshold = 0,
                    unit = 'LITERS',
                    status = 'ACTIVE'
                }) {
        this.id = id;
        this.providerId = providerId;
        this.name = name;
        this.type = type;
        this.description = description;
        this.pricePerLiter = pricePerLiter;
        this.stock = Number(stock) || 0;
        this.reserved = Number(reserved) || 0;
        this.capacity = Number(capacity) || 0;
        this.lowStockThreshold = Number(lowStockThreshold) || 0;
        this.unit = unit;
        this.status = String(status).toUpperCase() === 'AVAILABLE' ? 'ACTIVE' : status;
    }

    /**
     * Stock free to be promised to new orders: physical stock minus what's
     * already reserved by accepted orders awaiting dispatch.
     * @returns {number}
     */
    availableStock() {
        return Math.max(0, this.stock - this.reserved);
    }

    /** @returns {number} Fill percentage (physical stock) rounded to an integer. */
    fillPercentage() {
        if (!this.capacity) return 0;
        return Math.round((this.stock / this.capacity) * 100);
    }

    /** @returns {boolean} Whether available stock is at/below its low-stock threshold. */
    isLowStock() {
        return this.status === 'ACTIVE' && this.availableStock() <= this.lowStockThreshold;
    }
}
