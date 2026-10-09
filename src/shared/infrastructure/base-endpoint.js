/**
 * Reusable infrastructure endpoint adapter with CRUD operations.
 *
 * @class BaseEndpoint
 */
export class BaseEndpoint {
    /**
     * @param {import('./base-api.js').BaseApi} baseApi - Base API adapter exposing the HTTP client.
     * @param {string} endpointPath - Relative endpoint path.
     */
    constructor(baseApi, endpointPath) {
        this.http = baseApi.http;
        this.endpointPath = endpointPath;
    }

    /**
     * Retrieves a collection resource from the endpoint.
     * @returns {Promise<import('axios').AxiosResponse<Array<Object>|Object>>}
     */
    getAll() {
        return this.http.get(this.endpointPath);
    }

    /**
     * Retrieves one resource by identifier.
     * @param {number|string} id - Resource identifier.
     * @returns {Promise<import('axios').AxiosResponse<Object>>}
     */
    getById(id) {
        return this.http.get(`${this.endpointPath}/${id}`);
    }

    /**
     * Creates a new resource.
     * @param {Object} resource - Resource payload.
     * @returns {Promise<import('axios').AxiosResponse<Object>>}
     */
    create(resource) {
        return this.http.post(this.endpointPath, resource);
    }

    /**
     * Updates an existing resource.
     * @param {number|string} id - Resource identifier.
     * @param {Object} resource - Resource payload.
     * @returns {Promise<import('axios').AxiosResponse<Object>>}
     */
    update(id, resource) {
        return this.http.put(`${this.endpointPath}/${id}`, resource);
    }

    /**
     * Deletes one resource by identifier.
     * @param {number|string} id - Resource identifier.
     * @returns {Promise<import('axios').AxiosResponse<Object>>}
     */
    delete(id) {
        return this.http.delete(`${this.endpointPath}/${id}`);
    }
}