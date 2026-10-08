/**
 * Notification entity in the Notification bounded context.
 * Shared by both segments; `recipientType` + (companyId | providerId) scope it.
 *
 * @class Notification
 */
export class Notification {
    /**
     * @param {Object} params
     * @param {number|string|null} [params.id=null]
     * @param {('BUYER'|'PROVIDER')} [params.recipientType='BUYER']
     * @param {number|null} [params.companyId=null] - Buyer recipient.
     * @param {number|null} [params.providerId=null] - Provider recipient.
     * @param {string} [params.type=''] - Domain event type (e.g. NEW_REQUEST).
     * @param {string} [params.title=''] - Legacy fixed title (fallback).
     * @param {string} [params.message=''] - Legacy fixed message (fallback).
     * @param {string} [params.titleKey=''] - i18n key for the title.
     * @param {string} [params.messageKey=''] - i18n key for the message.
     * @param {Object} [params.params={}] - Interpolation params for the i18n keys.
     * @param {boolean} [params.read=false]
     * @param {number|string|null} [params.relatedId=null] - Related entity id.
     * @param {string|null} [params.createdAt=null]
     */
    constructor({
                    id = null,
                    recipientType = 'BUYER',
                    companyId = null,
                    providerId = null,
                    type = '',
                    title = '',
                    message = '',
                    titleKey = '',
                    messageKey = '',
                    params = {},
                    read = false,
                    relatedId = null,
                    createdAt = null,
                } = {}) {
        this.id = id;
        this.recipientType = recipientType;
        this.companyId = companyId;
        this.providerId = providerId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.titleKey = titleKey;
        this.messageKey = messageKey;
        this.params = params ?? {};
        this.read = read;
        this.relatedId = relatedId;
        this.createdAt = createdAt;
    }
}
