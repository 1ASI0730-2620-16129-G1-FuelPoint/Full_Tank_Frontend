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
const about = () => import('./shared/presentation/views/about.vue');
const terms = () => import('./shared/presentation/views/terms.vue');
const pageNotFound = () => import('./shared/presentation/views/page-not-found.vue');

// Dashboard now lives inside the Reporting & Analytics bounded context. The
// `/dashboard` URL is kept for backward compatibility but resolves to a
// Reporting & Analytics view (segment home for buyer/provider).
const dashboardView = () => import('./reporting/presentation/views/dashboard.vue');

const routes = [
    { path: '/', redirect: '/dashboard' },

    // IAM — login/register are public (no app shell); profile uses the shell
    { path: '/iam', component: RouterView, children: iamRoutes },

    // Segment home (Reporting & Analytics) + bounded contexts (layout shell)
    { path: '/dashboard', name: 'dashboard', component: dashboardView, meta: { title: 'Dashboard' } },
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
// here (dashboard, notifications, about, terms) is shared by both segments.
const PROVIDER_ONLY = ['/inventory', '/fulfillment', '/reporting/provider', '/ordering/pending', '/ordering/orders', '/ordering/collections'];
const BUYER_ONLY = ['/catalog', '/equipment', '/payment', '/reporting/buyer', '/ordering/my-requests', '/ordering/my-orders'];

const matchesPrefix = (path, prefixes) => prefixes.some(p => path === p || path.startsWith(p + '/'));

/**
 * Global guard: updates the document title, enforces the simulated IAM session
 * and keeps each segment inside its own area. A buyer reaching a provider-only
 * route (or vice versa) is redirected to the dashboard instead of seeing an
 * out-of-context screen.
 *
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {import('vue-router').RouteLocationNormalized} from
 * @returns {boolean|string}
 */
router.beforeEach((to, from) => {
    document.title = `FullTank - ${to.meta['title'] ?? 'B2B Fuel Platform'}`;

    const iamStore = useIamStore(pinia);

    // Authenticated users have no business on the login / register screens.
    const guestOnly = ['/iam', '/iam/login', '/iam/register', '/iam/demo'];
    if (iamStore.isAuthenticated && guestOnly.includes(to.path)) return '/dashboard';

    if (to.meta.public) return true;
    if (!iamStore.isAuthenticated) return '/iam/login';

    // Role guards: redirect to the dashboard when the segment doesn't match.
    if (iamStore.isProvider && matchesPrefix(to.path, BUYER_ONLY)) return '/dashboard';
    if (!iamStore.isProvider && matchesPrefix(to.path, PROVIDER_ONLY)) return '/dashboard';

    return true;
});

export default router;
