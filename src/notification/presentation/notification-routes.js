const notificationList = () => import('./views/notification-list.vue');

/**
 * Notification presentation routes mounted under `/notification`.
 * Fully compatible with PrimeFuel reference routes.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const notificationRoutes = [
    { path: '', name: 'notification-home', component: notificationList, meta: { title: 'Notifications' } },
    { path: 'notification-list', name: 'notification-list', component: notificationList, meta: { title: 'Notifications' } },
];

export default notificationRoutes;
