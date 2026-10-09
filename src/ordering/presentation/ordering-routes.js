const providerRequestList = () => import('./views/provider-request-list.vue');
const orderList           = () => import('./views/order-list.vue');
const orderDetail         = () => import('./views/order-detail.vue');
const collections         = () => import('./views/collections.vue');
const myRequests          = () => import('./views/my-requests.vue');
const myOrders            = () => import('./views/my-orders.vue');
const buyerOrderDetail    = () => import('./views/buyer-order-detail.vue');

/**
 * Ordering presentation routes mounted under `/ordering`.
 * Provider views: pending requests + orders. Buyer views: my requests + my orders.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const orderingRoutes = [
    // Provider
    { path: 'pending',     name: 'ordering-provider-pending', component: providerRequestList, meta: { title: 'Pending Requests' } },
    { path: 'orders',      name: 'ordering-orders',           component: orderList,           meta: { title: 'Orders' } },
    { path: 'orders/:id',  name: 'ordering-order-detail',     component: orderDetail,         meta: { title: 'Order Detail' } },
    { path: 'collections', name: 'ordering-collections',      component: collections,         meta: { title: 'Collections' } },
    // Buyer
    { path: 'my-requests', name: 'ordering-my-requests',      component: myRequests,          meta: { title: 'My Requests' } },
    { path: 'my-orders',   name: 'ordering-my-orders',        component: myOrders,            meta: { title: 'My Orders' } },
    { path: 'my-orders/:id', name: 'ordering-my-order-detail', component: buyerOrderDetail,   meta: { title: 'Order Detail' } },
];

export default orderingRoutes;
