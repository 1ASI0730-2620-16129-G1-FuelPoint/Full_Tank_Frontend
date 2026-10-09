import { Request } from "../domain/model/request.entity.js";

/**
 * Maps Ordering request resources into domain entities.
 *
 * @class RequestAssembler
 */
export class RequestAssembler {
    /**
     * @param {Object} resource - Request resource payload.
     * @returns {Request} Request entity.
     */
    static toEntityFromResource(resource) {
        return new Request({
            ...resource,
            companyId: resource.companyId ?? resource.buyerCompanyId,
            clientId: resource.clientId ?? resource.buyerCompanyId,
        });
    }

    /**
     * Parses request resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|{requests: Array<Object>}>} response
     * @returns {Request[]} Request entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array
            ? response.data
            : response.data['requests'];

        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
