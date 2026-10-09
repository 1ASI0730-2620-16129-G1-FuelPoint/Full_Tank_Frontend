/**
 * Provider entity in the Catalog bounded context (buyer view).
 * Read-only projection of a provider company shown in the catalog.
 *
 * @class Provider
 */
export class Provider {
    /**
     * @param {Object} params
     * @param {number|string|null} [params.id=null]
     * @param {string} [params.name='']
     * @param {string} [params.ruc='']
     * @param {number} [params.rating=0]
     * @param {number} [params.ratingsCount=0]
     * @param {string} [params.address='']
     * @param {string} [params.phone='']
     * @param {string[]} [params.fuelTypesOffered=[]]
     * @param {string} [params.description='']
     */
    constructor({
                    id = null,
                    name = '',
                    ruc = '',
                    rating = 0,
                    ratingsCount = 0,
                    address = '',
                    phone = '',
                    fuelTypesOffered = [],
                    description = '',
                } = {}) {
        this.id = id;
        this.name = name;
        this.ruc = ruc;
        this.rating = Number(rating) || 0;
        this.ratingsCount = Number(ratingsCount) || 0;
        this.address = address;
        this.phone = phone;
        this.fuelTypesOffered = fuelTypesOffered;
        this.description = description;
    }

    /**
     * @param {string} fuelType
     * @returns {boolean} Whether this provider offers a fuel type.
     */
    offers(fuelType) {
        return this.fuelTypesOffered.includes(fuelType);
    }
}
