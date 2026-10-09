import { createRouter, createWebHistory, RouterView } from 'vue-router';
import i18n from './i18n.js';
import iamRoutes from './iam/presentation/iam-routes.js';
import { createIamGuard } from './iam/application/route-guard.js';

// Register BC routes in their own PRs after their files are incorporated.
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', name: 'home', component: () => import('./shared/presentation/views/home.vue'), meta: { public: true } },
        { path: '/iam', component: RouterView, children: iamRoutes },
        { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('./shared/presentation/views/page-not-found.vue'), meta: { public: true } },
    ],
    scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(createIamGuard());

router.afterEach((to) => {
    document.title = to.name === 'not-found'
        ? `${i18n.global.t('notFound.title')} | FullTank`
        : to.meta.title ? `${to.meta.title} | FullTank` : 'FullTank';
});

export default router;
