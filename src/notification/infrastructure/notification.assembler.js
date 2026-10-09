import { Notification } from "../domain/model/notification.entity.js";

/**
 * Maps Notification resources into domain entities.
 *
 * @class NotificationAssembler
 */
export class NotificationAssembler {
    /**
     * @param {Object} resource
     * @returns {Notification}
     */
    static toEntityFromResource(resource) {
        return new Notification({
            ...resource,
            companyId: resource.companyId ?? resource.buyerCompanyId,
            read: resource.read ?? resource.isRead ?? false,
        });
    }

    /**
     * @param {import('axios').AxiosResponse<Array<Object>>} response
     * @returns {Notification[]}
     */
    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array
            ? response.data
            : response.data['notifications'] ?? [];
        return resources.map(resource => this.toEntityFromResource(resource));
    }
}
