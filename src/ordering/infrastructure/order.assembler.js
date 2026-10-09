import { Order } from '../domain/model/order.entity.js';

/**
 * Maps Ordering order resources into domain entities.
 *
 * @class OrderAssembler
 */
export class OrderAssembler {
    /**
     * @param {Object} resource - Order resource payload.
     * @returns {Order} Order entity.
     */
    static toEntityFromResource(resource) {
        return new Order({
            ...resource,
            companyId: resource.companyId ?? resource.buyerCompanyId,
            clientId: resource.clientId ?? resource.buyerCompanyId,
        });
    }

    /**
     * @param {import('axios').AxiosResponse} response
     * @returns {Order[]}
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : (response.data['orders'] ?? []);
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
