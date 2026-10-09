/**
 * CatalogProduct entity in the Catalog bounded context (buyer view).
 * A product offered by a provider, projected from the provider's real inventory
 * tank (stock-aware), as seen by buyers when browsing the catalog.
 *
 * @class CatalogProduct
 */
export class CatalogProduct {
    /**
     * @param {Object} params
     * @param {number|string|null} [params.id=null]
     * @param {number|null} [params.providerId=null]
     * @param {string} [params.fuelType='']
     * @param {string} [params.name='']
     * @param {string} [params.description='']
     * @param {number} [params.pricePerLiter=0]
     * @param {number} [params.stock=0] - Available stock from provider inventory.
     * @param {number} [params.capacity=0] - Tank capacity from provider inventory.
     * @param {string} [params.unit='LITERS']
     * @param {boolean} [params.active=true] - Whether the inventory product is enabled.
     * @param {boolean} [params.available=true] - Stock>0 and tank active.
     */
    constructor({
                    id = null,
                    providerId = null,
                    fuelType = '',
                    name = '',
                    description = '',
                    pricePerLiter = 0,
                    stock = 0,
                    capacity = 0,
                    unit = 'LITERS',
                    active = true,
                    available = true,
                } = {}) {
        this.id = id;
        this.providerId = providerId;
        this.fuelType = fuelType;
        this.name = name;
        this.description = description;
        this.pricePerLiter = pricePerLiter;
        this.stock = Number(stock) || 0;
        this.capacity = Number(capacity) || 0;
        this.unit = unit;
        this.active = active;
        this.available = available;
    }
}
