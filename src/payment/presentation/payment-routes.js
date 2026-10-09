const paymentList = () => import('./views/payment-list.vue');

/**
 * Payment presentation routes mounted under `/payment` (buyer only).
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const paymentRoutes = [
    { path: '', name: 'payment-list', component: paymentList, meta: { title: 'Payments' } },
];

export default paymentRoutes;
