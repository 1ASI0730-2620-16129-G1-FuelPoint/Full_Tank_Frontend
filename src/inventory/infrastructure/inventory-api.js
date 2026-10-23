import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const inventoryEndpointPath = import.meta.env.VITE_INVENTORY_ENDPOINT_PATH;
const inventoryMovementsPath = import.meta.env.VITE_INVENTORY_MOVEMENTS_ENDPOINT_PATH;

/**
 * Infrastructure adapter for Inventory HTTP endpoints.
 *
 * @class InventoryApi
 * @extends BaseApi
 */
export class InventoryApi extends BaseApi {
    /** @type {BaseEndpoint} */
    #inventoryEndpoint;
    /** @type {BaseEndpoint} */
    #movementsEndpoint;

    /** Creates endpoint client for the inventory resource. */
    constructor() {
        super();
        this.#inventoryEndpoint = new BaseEndpoint(this, inventoryEndpointPath);
        this.#movementsEndpoint = new BaseEndpoint(this, inventoryMovementsPath);
    }

    /** @returns {Promise<import('axios').AxiosResponse>} */
    getMovements() {
        return this.#movementsEndpoint.getAll();
    }

    /** @param {Object} resource @returns {Promise<import('axios').AxiosResponse>} */
    createMovement(resource) {
        return this.#movementsEndpoint.create(resource);
    }

    /**
     * Retrieves all product resources.
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    getProducts() {
        return this.#inventoryEndpoint.getAll();
    }

    /**
     * Retrieves one product resource by identifier.
     * @param {number|string} id
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    getProductById(id) {
        return this.#inventoryEndpoint.getById(id);
    }

    /**
     * Persists a new product resource.
     * @param {Object|import('../domain/model/product.entity.js').Product} resource
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    createProduct(resource) {
        return this.#inventoryEndpoint.create(resource);
    }

    /**
     * Updates an existing product resource.
     * @param {Object|import('../domain/model/product.entity.js').Product} resource
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    updateProduct(resource) {
        return this.#inventoryEndpoint.update(resource.id, resource);
    }

    /**
     * Deletes one product resource by identifier.
     * @param {number|string} id
     * @returns {Promise<import('axios').AxiosResponse>}
     */
    deleteProduct(id) {
        return this.#inventoryEndpoint.delete(id);
    }
}