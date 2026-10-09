/**
 * Driver entity in the Fulfillment bounded context.
 *
 * @class Driver
 */
export class Driver {
    /**
     * @param {Object} params - Entity attributes.
     * @param {number|string|null} [params.id=null] - Driver identifier.
     * @param {number|string|null} [params.providerId=null] - Owning provider.
     * @param {string} [params.name=''] - Full name.
     * @param {string} [params.licenseNumber=''] - Driver's license number.
     * @param {string} [params.phone=''] - Contact phone.
     * @param {string} [params.email=''] - Contact email.
     * @param {string} [params.status='AVAILABLE'] - Driver status.
     */
    constructor({
                    id = null,
                    providerId = null,
                    name = '',
                    licenseNumber = '',
                    phone = '',
                    email = '',
                    status = 'AVAILABLE'
                }) {
        this.id = id;
        this.providerId = providerId;
        this.name = name;
        this.licenseNumber = licenseNumber;
        this.phone = phone;
        this.email = email;
        this.status = status;
    }
}
