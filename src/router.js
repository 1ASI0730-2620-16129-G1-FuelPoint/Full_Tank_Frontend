import { createRouter, createWebHistory } from "vue-router";
import { RouterView } from 'vue-router';

import iamRoutes from "./iam/presentation/iam-routes.js";
import catalogRoutes from "./catalog/presentation/catalog-routes.js";
import equipmentRoutes from "./equipment/presentation/equipment-routes.js";
import inventoryRoutes from "./inventory/presentation/inventory-routes.js";
import orderingRoutes from "./ordering/presentation/ordering-routes.js";
import fulfillmentRoutes from "./fulfillment/presentation/fulfillment-routes.js";
import paymentRoutes from "./payment/presentation/payment-routes.js";
import notificationRoutes from "./notification/presentation/notification-routes.js";
import reportingRoutes from "./reporting/presentation/reporting-routes.js";

import useIamStore from "./iam/application/iam.store.js";
import pinia from "./pinia.js";

// Lazy-loaded shared views
const homeView = () => import('./shared/presentation/views/home.vue');
const about = () => import('./shared/presentation/views/about.vue');
const terms = () => import('./shared/presentation/views/terms.vue');
const pageNotFound = () => import('./shared/presentation/views/page-not-found.vue');

const routes = [
    { path: '/', redirect: '/dashboard' },
    { path: '/home', name: 'home', component: homeView, meta: { title: 'Home', public: true } },

    // IAM — login/register are public (no app shell); profile uses the shell
    { path: '/iam', component: RouterView, children: iamRoutes },

    // Segment home: redirect /dashboard to canonical role dashboard, 100% compatible with PrimeFuel
    {
        path: '/dashboard',
        name: 'dashboard',
        redirect: () => {
            try {
                const iamStore = useIamStore(pinia);
                return iamStore.isBuyer ? '/reporting/buyer-dashboard' : '/reporting/provider-dashboard';
            } catch {
                return '/reporting/provider-dashboard';
            }
        },
        meta: { title: 'Dashboard' }
    },
    { path: '/catalog', component: RouterView, children: catalogRoutes },
    { path: '/equipment', component: RouterView, children: equipmentRoutes },
    { path: '/inventory', component: RouterView, children: inventoryRoutes },
    { path: '/ordering', component: RouterView, children: orderingRoutes },
    { path: '/fulfillment', component: RouterView, children: fulfillmentRoutes },
    { path: '/payment', component: RouterView, children: paymentRoutes },
    { path: '/notification', component: RouterView, children: notificationRoutes },
    { path: '/reporting', component: RouterView, children: reportingRoutes },

    { path: '/about', name: 'about', component: about, meta: { title: 'About' } },
    { path: '/terms', name: 'terms', component: terms, meta: { title: 'Terms & Conditions', public: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: pageNotFound, meta: { title: 'Page Not Found' } },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
});

// Route prefixes that belong exclusively to one segment. Anything not listed
// here (dashboard, notifications, about, terms, home) is shared by both segments.
const PROVIDER_ONLY = [
    '/inventory',
    '/fulfillment',
    '/reporting/provider',
    '/reporting/provider-dashboard',
    '/reporting/client-reports',
    '/reporting/fulfillment-kpi',
    '/reporting/report-main',
    '/ordering/pending',
    '/ordering/request-list',
    '/ordering/orders',
    '/ordering/order-list',
    '/ordering/collections'
];
const BUYER_ONLY = [
    '/catalog',
    '/equipment',
    '/payment',
    '/reporting/buyer',
    '/reporting/buyer-report',
    '/reporting/buyer-dashboard',
    '/ordering/my-requests',
    '/ordering/my-orders',
    '/ordering/buyer-order',
    '/ordering/request-form'
];

const matchesPrefix = (path, prefixes) => prefixes.some(p => path === p || path.startsWith(p + '/'));

/**
 * Global guard: updates the document title, enforces the simulated IAM session
 * and keeps each segment inside its own area. A buyer reaching a provider-only
 * route (or vice versa) is redirected to their own dashboard instead of seeing
 * an out-of-context screen.
 *
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {import('vue-router').RouteLocationNormalized} from
 * @returns {boolean|string|object}
 */
router.beforeEach((to, from) => {
    document.title = `FullTank - ${to.meta['title'] ?? 'B2B Fuel Platform'}`;

    const iamStore = useIamStore(pinia);

    // Authenticated users have no business on the login / register screens.
    const guestOnly = ['/iam', '/iam/login', '/iam/register', '/iam/demo'];
    if (iamStore.isAuthenticated && guestOnly.includes(to.path)) {
        return iamStore.isBuyer ? '/reporting/buyer-dashboard' : '/reporting/provider-dashboard';
    }

    if (to.meta.public) return true;
    if (!iamStore.isAuthenticated) {
        return { path: '/iam/login', query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined };
    }

    // Role guards: redirect to the role dashboard when the segment doesn't match.
    if (iamStore.isProvider && matchesPrefix(to.path, BUYER_ONLY)) {
        return '/reporting/provider-dashboard';
    }
    if (!iamStore.isProvider && matchesPrefix(to.path, PROVIDER_ONLY)) {
        return '/reporting/buyer-dashboard';
    }

    return true;
});

export default router;
