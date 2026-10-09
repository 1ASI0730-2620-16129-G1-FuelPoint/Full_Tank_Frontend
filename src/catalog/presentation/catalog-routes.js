const catalogView = () => import('./views/catalog-view.vue');
const providerDetail = () => import('./views/provider-detail.vue');

/**
 * Catalog presentation routes mounted under `/catalog` (buyer only).
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const catalogRoutes = [
    { path: '', name: 'catalog', component: catalogView, meta: { title: 'Catalog' } },
    { path: 'providers/:id', name: 'catalog-provider-detail', component: providerDetail, meta: { title: 'Provider Detail' } },
];

export default catalogRoutes;
