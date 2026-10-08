import { Vehicle } from "../domain/model/vehicle.entity.js";

/**
 * Maps Fulfillment vehicle resources into domain entities.
 *
 * @class VehicleAssembler
 */
export class VehicleAssembler {
    /**
     * @param {Object} resource - Vehicle resource payload.
     * @returns {Vehicle} Vehicle entity.
     */
    static toEntityFromResource(resource) {
        return new Vehicle({ ...resource });
    }

    /**
     * Parses vehicle resources from a response and maps them into entities.
     *
     * @param {import('axios').AxiosResponse<Array<Object>|{vehicles: Array<Object>}>} response
     * @returns {Vehicle[]} Vehicle entities.
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        let resources = response.data instanceof Array
            ? response.data
            : response.data['vehicles'];

        return resources.map(resource => this.toEntityFromResource(resource));
    }
}