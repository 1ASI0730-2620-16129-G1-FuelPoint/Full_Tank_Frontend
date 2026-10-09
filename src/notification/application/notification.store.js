/**
 * Application service store for the Notification bounded context.
 *
 * Other bounded contexts never mutate notification state directly: they go
 * through the shared coordination service, which calls {@link createNotification}.
 *
 * @module useNotificationStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { NotificationApi } from "../infrastructure/notification-api.js";
import { NotificationAssembler } from "../infrastructure/notification.assembler.js";
import { Notification } from "../domain/model/notification.entity.js";
import i18n from "../../i18n.js";

const notificationApi = new NotificationApi();

const useNotificationStore = defineStore('notification', () => {
    /** @type {import('vue').Ref<Notification[]>} */
    const notifications = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const loaded = ref(false);
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);

    /** @type {import('vue').ComputedRef<number>} */
    const unreadCount = computed(() => notifications.value.filter(n => !n.read).length);

    /**
     * Loads all notifications (filtering is done by the views per recipient).
     * @returns {Promise<void>}
     */
    function fetchNotifications() {
        loading.value = true;
        return notificationApi.getNotifications()
            .then(response => {
                notifications.value = NotificationAssembler.toEntitiesFromResponse(response);
                loaded.value = true;
            })
            .catch(error => { errors.value.push(error); })
            .finally(() => { loading.value = false; });
    }

    /**
     * Notifications addressed to a buyer company.
     * @param {number} companyId
     * @returns {Notification[]}
     */
    function forBuyer(companyId) {
        return notifications.value
            .filter(n => n.recipientType === 'BUYER' && n.companyId === companyId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Notifications addressed to a provider company.
     * @param {number} providerId
     * @returns {Notification[]}
     */
    function forProvider(providerId) {
        return notifications.value
            .filter(n => n.recipientType === 'PROVIDER' && n.providerId === providerId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Creates and persists a notification.
     * @param {Object} payload - Notification attributes.
     * @returns {Promise<Notification|null>}
     */
    function createNotification(payload) {
        const title = payload.title || translateNotificationText(payload.titleKey, payload.params);
        const message = payload.message || translateNotificationText(payload.messageKey, payload.params);
        const draft = new Notification({
            read: false,
            createdAt: new Date().toISOString(),
            ...payload,
            title,
            message,
        });
        return notificationApi.createNotification(draft)
            .then(response => {
                const created = NotificationAssembler.toEntityFromResource(response.data);
                notifications.value.push(created);
                return created;
            })
            .catch(error => {
                errors.value.push(error);
                return null;
            });
    }

    /**
     * Marks a notification as read.
     * @param {Notification} notification
     * @returns {Promise<void>}
     */
    function markAsRead(notification) {
        if (notification.read) return Promise.resolve();
        const updated = new Notification({ ...notification, read: true });
        const index = notifications.value.findIndex(n => n.id === notification.id);
        if (index !== -1) notifications.value[index] = updated;
        return notificationApi.updateNotification(updated)
            .catch(error => { errors.value.push(error); });
    }

    /**
     * Marks every notification of a recipient as read.
     * @param {('BUYER'|'PROVIDER')} recipientType
     * @param {number} id - companyId or providerId.
     */
    function markAllAsRead(recipientType, id) {
        const targets = notifications.value.filter(n =>
            n.recipientType === recipientType && !n.read &&
            (recipientType === 'BUYER' ? n.companyId === id : n.providerId === id)
        );
        notifications.value = notifications.value.map(n =>
            targets.some(target => target.id === n.id) ? new Notification({ ...n, read: true }) : n
        );
        return notificationApi.markAllAsRead(recipientType, id)
            .catch(error => {
                errors.value.push(error);
                return Promise.all(targets.map(markAsRead));
            });
    }

    function clearErrors() { errors.value = []; }

    return {
        notifications,
        loaded,
        loading,
        errors,
        unreadCount,
        fetchNotifications,
        forBuyer,
        forProvider,
        createNotification,
        markAsRead,
        markAllAsRead,
        clearErrors,
    };
});

function translateNotificationText(key, params = {}) {
    if (!key) return '';
    const translated = i18n.global.t(key, params ?? {});
    return translated === key ? '' : translated;
}

export default useNotificationStore;
