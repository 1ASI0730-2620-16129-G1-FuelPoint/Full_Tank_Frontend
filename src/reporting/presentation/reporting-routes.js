import useIamStore from '../../iam/application/iam.store.js';
import pinia from '../../pinia.js';

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
    {
        path: '',
        redirect: () => {
            try {
                const iamStore = useIamStore(pinia);
                return iamStore.isBuyer ? '/reporting/buyer' : '/reporting/provider';
            } catch {
                return '/reporting/provider';
            }
        }
    },
    { path: 'client-reports', redirect: 'provider' },
    { path: 'fulfillment-kpi', redirect: 'provider' },
    { path: 'provider', name: 'reporting-provider', component: providerReport, meta: { title: 'Reports & Analytics' } },
    { path: 'buyer', name: 'reporting-buyer', component: buyerReport, meta: { title: 'My Reports' } },
];

export default reportingRoutes;
