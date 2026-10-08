import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const equipmentPath = import.meta.env.VITE_EQUIPMENT_ENDPOINT_PATH;
const favoriteProvidersPath = import.meta.env.VITE_FAVORITE_PROVIDERS_ENDPOINT_PATH;
const refillHistoryPath = import.meta.env.VITE_REFILL_HISTORY_ENDPOINT_PATH;

/**
 * Infrastructure adapter for Equipment HTTP endpoints (equipment, favorites,
 * refill history).
 *
 * @class EquipmentApi
 * @extends BaseApi
 */
export class EquipmentApi extends BaseApi {
    /** @type {BaseEndpoint} */
    #equipmentEndpoint;
    /** @type {BaseEndpoint} */
    #favoritesEndpoint;
    /** @type {BaseEndpoint} */
    #refillHistoryEndpoint;

    constructor() {
        super();
        this.#equipmentEndpoint = new BaseEndpoint(this, equipmentPath);
        this.#favoritesEndpoint = new BaseEndpoint(this, favoriteProvidersPath);
        this.#refillHistoryEndpoint = new BaseEndpoint(this, refillHistoryPath);
    }

    /** @returns {Promise<import('axios').AxiosResponse>} */
    getEquipment() { return this.#equipmentEndpoint.getAll(); }

    /** @param {Object} resource @returns {Promise<import('axios').AxiosResponse>} */
    createEquipment(resource) { return this.#equipmentEndpoint.create(resource); }

    /** @param {Object} resource @returns {Promise<import('axios').AxiosResponse>} */
    updateEquipment(resource) { return this.#equipmentEndpoint.update(resource.id, resource); }

    /** @param {number|string} id @returns {Promise<import('axios').AxiosResponse>} */
    deleteEquipment(id) { return this.#equipmentEndpoint.delete(id); }

    /** @returns {Promise<import('axios').AxiosResponse>} */
    getFavoriteProviders() { return this.#favoritesEndpoint.getAll(); }

    /** @returns {Promise<import('axios').AxiosResponse>} */
    getRefillHistory() { return this.#refillHistoryEndpoint.getAll(); }

    /** @param {Object} resource @returns {Promise<import('axios').AxiosResponse>} */
    createRefillHistory(resource) { return this.#refillHistoryEndpoint.create(resource); }
}
