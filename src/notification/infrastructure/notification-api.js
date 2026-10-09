import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const notificationsEndpointPath = import.meta.env.VITE_NOTIFICATIONS_ENDPOINT_PATH;

/**
 * Infrastructure adapter for Notification HTTP endpoints.
 *
 * @class NotificationApi
 * @extends BaseApi
 */
export class NotificationApi extends BaseApi {
    /** @type {BaseEndpoint} */
    #notificationsEndpoint;

    constructor() {
        super();
        this.#notificationsEndpoint = new BaseEndpoint(this, notificationsEndpointPath);
    }

    /** @returns {Promise<import('axios').AxiosResponse>} */
    getNotifications() {
        return this.#notificationsEndpoint.getAll();
    }

    /** @param {Object} resource @returns {Promise<import('axios').AxiosResponse>} */
    createNotification(resource) {
        return this.#notificationsEndpoint.create({
            recipientType: resource.recipientType,
            buyerCompanyId: resource.companyId ?? null,
            providerId: resource.providerId ?? null,
            type: resource.type,
            title: resource.title,
            message: resource.message,
            isRead: resource.read ?? false,
            relatedId: resource.relatedId ?? null,
            targetRoute: resource.targetRoute ?? '',
        });
    }

    /** @param {Object} resource @returns {Promise<import('axios').AxiosResponse>} */
    updateNotification(resource) {
        return this.http.post(`${notificationsEndpointPath}/${resource.id}/read`);
    }

    /** @param {string} recipientType @param {number|string} id @returns {Promise<import('axios').AxiosResponse>} */
    markAllAsRead(recipientType, id) {
        const recipientPath = recipientType === 'BUYER' ? 'buyer' : 'provider';
        return this.http.post(`${notificationsEndpointPath}/${recipientPath}/${id}/read-all`);
    }

    /** @param {number|string} id @returns {Promise<import('axios').AxiosResponse>} */
    deleteNotification(id) {
        return this.#notificationsEndpoint.delete(id);
    }
}
