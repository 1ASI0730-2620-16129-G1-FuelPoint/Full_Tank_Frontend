import { Driver } from "../domain/model/driver.entity.js";

/**
 * Maps Fulfillment driver resources into domain entities.
 *
 * @class DriverAssembler
 */
export class DriverAssembler {
    /**
     * @param {Object} resource - Driver resource payload.
     * @returns {Driver} Driver entity.
     */
    static toEntityFromResource(resource) {
        return new Driver({ ...resource });
    }

    /**
     * Parses driver resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|{drivers: Array<Object>}>} response
     * @returns {Driver[]} Driver entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array
            ? response.data
            : response.data['drivers'];

        return resources.map(resource => this.toEntityFromResource(resource));
    }
}