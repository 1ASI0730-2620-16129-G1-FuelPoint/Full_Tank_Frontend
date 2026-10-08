/**
 * Equipment entity in the Equipment bounded context (buyer/applicant only).
 * Represents a fuel-consuming asset such as a truck, generator or boiler.
 *
 * @class Equipment
 */
export class Equipment {
    /**
     * @param {Object} params
     * @param {number|string|null} [params.id=null]
     * @param {number|null} [params.companyId=null] - Owning buyer company.
     * @param {string} [params.name='']
     * @param {string} [params.type=''] - Equipment kind (e.g. Boiler).
     * @param {string} [params.requiredFuelType=''] - Fuel the asset consumes.
     * @param {number} [params.capacity=0] - Tank capacity.
     * @param {number} [params.currentLevel=0] - Current fuel in the tank.
     * @param {string} [params.unit='LITERS']
     * @param {string} [params.status='operational']
     * @param {number|null} [params.favoriteProviderId=null]
     * @param {boolean} [params.autoRefill=false]
     * @param {number} [params.refillThreshold=20] - % at/below which refill is needed.
     * @param {string} [params.location='']
     * @param {string|null} [params.lastRefillDate=null]
     */
    constructor({
                    id = null,
                    companyId = null,
                    name = '',
                    type = '',
                    requiredFuelType = '',
                    capacity = 0,
                    currentLevel = 0,
                    unit = 'LITERS',
                    status = 'operational',
                    favoriteProviderId = null,
                    autoRefill = false,
                    refillThreshold = 20,
                    location = '',
                    lastRefillDate = null,
                } = {}) {
        this.id = id;
        this.companyId = companyId;
        this.name = name;
        this.type = type;
        this.requiredFuelType = requiredFuelType;
        this.capacity = Number(capacity) || 0;
        this.currentLevel = Number(currentLevel) || 0;
        this.unit = unit;
        this.status = status;
        this.favoriteProviderId = favoriteProviderId;
        this.autoRefill = autoRefill;
        this.refillThreshold = Number(refillThreshold) || 0;
        this.location = location;
        this.lastRefillDate = lastRefillDate;
    }

    /** @returns {number} Fill percentage rounded to an integer. */
    fillPercentage() {
        if (!this.capacity) return 0;
        return Math.round((this.currentLevel / this.capacity) * 100);
    }

    /** @returns {boolean} Whether the asset is at/below its refill threshold. */
    needsRefill() {
        return this.fillPercentage() <= this.refillThreshold;
    }

    /** @returns {number} Fuel needed to top up the tank, in the asset's unit. */
    remainingCapacity() {
        return Math.max(0, this.capacity - this.currentLevel);
    }

    /**
     * Derives the operational status from the current fill level.
     * @returns {('operational'|'low_fuel'|'critical')}
     */
    deriveStatus() {
        const pct = this.fillPercentage();
        if (pct <= this.refillThreshold / 2) return 'critical';
        if (pct <= this.refillThreshold) return 'low_fuel';
        return 'operational';
    }
}
