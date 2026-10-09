const notificationList = () => import('./views/notification-list.vue');

/**
 * Notification presentation routes mounted under `/notification`.
 * Shared by both segments; the view renders the feed for the active session.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const notificationRoutes = [
    { path: '', name: 'notification-list', component: notificationList, meta: { title: 'Notifications' } },
];

export default notificationRoutes;
