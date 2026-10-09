import { Product } from "../domain/model/product.entity.js";

/**
 * Maps Inventory product resources into domain entities.
 *
 * @class ProductAssembler
 */
export class ProductAssembler {
    /**
     * @param {Object} resource - Product resource payload.
     * @returns {Product} Product entity.
     */
    static toEntityFromResource(resource) {
        return new Product({ ...resource });
    }

    /**
     * Parses product resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|{inventory: Array<Object>}>} response
     * @returns {Product[]} Product entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array
            ? response.data
            : response.data['inventory'];

        return resources.map(resource => this.toEntityFromResource(resource));
    }
}