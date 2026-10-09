import { Equipment } from "../domain/model/equipment.entity.js";

/**
 * Maps Equipment resources into domain entities.
 *
 * @class EquipmentAssembler
 */
export class EquipmentAssembler {
    /**
     * @param {Object} resource
     * @returns {Equipment}
     */
    static toEntityFromResource(resource) {
        return new Equipment({ ...resource });
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response
     * @returns {Equipment[]}
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : response.data['equipment'] ?? [];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
