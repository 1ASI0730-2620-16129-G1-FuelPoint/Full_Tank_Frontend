// Lazy-loaded components
const providerReport = () => import('./views/provider-report.vue');
const buyerReport = () => import('./views/buyer-report.vue');

/**
 * Reporting presentation routes mounted under `/reporting`.
 * Provider: unified sales & customer analytics. Buyer: spending analytics.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const reportingRoutes = [
    { path: 'provider', name: 'reporting-provider', component: providerReport, meta: { title: 'Reports & Analytics' } },
    { path: 'buyer', name: 'reporting-buyer', component: buyerReport, meta: { title: 'My Reports' } },
];

export default reportingRoutes;
