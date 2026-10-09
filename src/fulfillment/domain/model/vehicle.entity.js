/**
 * Vehicle entity in the Fulfillment bounded context.
 *
 * @class Vehicle
 */
export class Vehicle {
    /**
     * @param {Object} params - Entity attributes.
     * @param {number|string|null} [params.id=null] - Vehicle identifier.
     * @param {number|string|null} [params.providerId=null] - Owning provider.
     * @param {string} [params.plate=''] - License plate.
     * @param {string} [params.brand=''] - Vehicle brand.
     * @param {string} [params.model=''] - Vehicle model.
     * @param {number} [params.capacity=0] - Fuel capacity.
     * @param {string} [params.unit='LITERS'] - Capacity unit.
     * @param {string} [params.status='AVAILABLE'] - Vehicle status.
     */
    constructor({
                    id = null,
                    providerId = null,
                    plate = '',
                    brand = '',
                    model = '',
                    capacity = 0,
                    unit = 'LITERS',
                    status = 'AVAILABLE'
                }) {
        this.id = id;
        this.providerId = providerId;
        this.plate = plate;
        this.brand = brand;
        this.model = model;
        this.capacity = capacity;
        this.unit = unit;
        this.status = status;
    }
}
