import useIamStore from '../../iam/application/iam.store.js';
import pinia from '../../pinia.js';

// Lazy-loaded components
const buyerDashboard = () => import('./views/buyer-dashboard.vue');
const providerDashboard = () => import('./views/provider-dashboard.vue');
const providerReport = () => import('./views/provider-report.vue');
const buyerReport = () => import('./views/buyer-report.vue');
const dashboardView = () => import('./views/dashboard.vue');

/**
 * Reporting presentation routes mounted under `/reporting`.
 * Fully compatible with PrimeFuel reference routes.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const reportingRoutes = [
    {
        path: '',
        redirect: () => {
            try {
                const iamStore = useIamStore(pinia);
                return iamStore.isBuyer ? '/reporting/buyer-dashboard' : '/reporting/provider-dashboard';
            } catch {
                return '/reporting/provider-dashboard';
            }
        }
    },
    { path: 'buyer-dashboard', name: 'reporting-buyer-dashboard', component: buyerDashboard, meta: { title: 'Buyer Dashboard' } },
    { path: 'provider-dashboard', name: 'reporting-provider-dashboard', component: providerDashboard, meta: { title: 'Provider Dashboard' } },
    { path: 'buyer', name: 'reporting-buyer', component: buyerReport, meta: { title: 'My Reports' } },
    { path: 'buyer-report', redirect: 'buyer' },
    { path: 'provider', name: 'reporting-provider', component: providerReport, meta: { title: 'Reports & Analytics' } },
    { path: 'report-main', redirect: 'provider' },
    { path: 'client-reports', redirect: 'provider' },
    { path: 'fulfillment-kpi', redirect: 'provider' },
    { path: 'legacy-dashboard', name: 'reporting-legacy-dashboard', component: dashboardView, meta: { title: 'Dashboard' } },
];

export default reportingRoutes;
