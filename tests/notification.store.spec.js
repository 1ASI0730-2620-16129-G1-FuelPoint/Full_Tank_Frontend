import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useNotificationStore from '../src/notification/application/notification.store.js';
import { NotificationApi } from '../src/notification/infrastructure/notification-api.js';
import { Notification } from '../src/notification/domain/model/notification.entity.js';

vi.mock('../src/notification/infrastructure/notification-api.js', () => {
    const MockNotificationApi = vi.fn();
    MockNotificationApi.prototype.getNotifications = vi.fn();
    MockNotificationApi.prototype.createNotification = vi.fn();
    MockNotificationApi.prototype.updateNotification = vi.fn();
    MockNotificationApi.prototype.markAllAsRead = vi.fn();
    return { NotificationApi: MockNotificationApi };
});

describe('Notification Store - Alert State & Read Tracking', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        NotificationApi.prototype.getNotifications.mockResolvedValue({ data: [] });
        NotificationApi.prototype.updateNotification.mockResolvedValue({ data: {} });
        NotificationApi.prototype.markAllAsRead.mockResolvedValue({ data: {} });
    });

    it('computes unreadCount accurately based on unread items', () => {
        const store = useNotificationStore();
        store.notifications = [
            new Notification({ id: 1, read: false, title: 'Alert 1' }),
            new Notification({ id: 2, read: true, title: 'Alert 2' }),
            new Notification({ id: 3, read: false, title: 'Alert 3' }),
        ];

        expect(store.unreadCount).toBe(2);
    });

    it('marks a single notification as read and updates state', async () => {
        const store = useNotificationStore();
        const item = new Notification({ id: 10, read: false, title: 'New Request' });
        store.notifications = [item];

        await store.markAsRead(item);

        expect(store.notifications[0].read).toBe(true);
        expect(store.unreadCount).toBe(0);
        expect(NotificationApi.prototype.updateNotification).toHaveBeenCalledWith(
            expect.objectContaining({ id: 10, read: true })
        );
    });

    it('marks all recipient notifications as read', async () => {
        const store = useNotificationStore();
        store.notifications = [
            new Notification({ id: 1, recipientType: 'PROVIDER', providerId: 101, read: false }),
            new Notification({ id: 2, recipientType: 'PROVIDER', providerId: 101, read: false }),
            new Notification({ id: 3, recipientType: 'BUYER', companyId: 202, read: false }),
        ];

        await store.markAllAsRead('PROVIDER', 101);

        expect(store.notifications.find(n => n.id === 1).read).toBe(true);
        expect(store.notifications.find(n => n.id === 2).read).toBe(true);
        expect(store.notifications.find(n => n.id === 3).read).toBe(false);
        expect(store.unreadCount).toBe(1);
        expect(NotificationApi.prototype.markAllAsRead).toHaveBeenCalledWith('PROVIDER', 101);
    });

    it('filters notifications correctly by buyer and provider segments', () => {
        const store = useNotificationStore();
        store.notifications = [
            new Notification({ id: 1, recipientType: 'BUYER', companyId: 50, createdAt: '2026-10-08T10:00:00Z' }),
            new Notification({ id: 2, recipientType: 'BUYER', companyId: 50, createdAt: '2026-10-08T12:00:00Z' }),
            new Notification({ id: 3, recipientType: 'PROVIDER', providerId: 99, createdAt: '2026-10-08T11:00:00Z' }),
        ];

        const buyerFeed = store.forBuyer(50);
        expect(buyerFeed).toHaveLength(2);
        expect(buyerFeed[0].id).toBe(2);

        const providerFeed = store.forProvider(99);
        expect(providerFeed).toHaveLength(1);
        expect(providerFeed[0].id).toBe(3);
    });
});
