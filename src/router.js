import { createRouter, createWebHistory, RouterView } from 'vue-router';
import i18n from './i18n.js';
import notificationRoutes from './notification/presentation/notification-routes.js';

// Register BC routes in their own PRs after their files are incorporated.
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', name: 'home', component: () => import('./shared/presentation/views/home.vue') },
        { path: '/notification', component: RouterView, children: notificationRoutes },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./shared/presentation/views/page-not-found.vue') },
    ],
    scrollBehavior: () => ({ top: 0 }),
});

router.afterEach((to) => {
    document.title = to.name === 'not-found'
        ? `${i18n.global.t('notFound.title')} | FullTank`
        : 'FullTank';
});

export default router;
