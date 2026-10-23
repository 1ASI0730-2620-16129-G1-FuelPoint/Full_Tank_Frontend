// Lazy-loaded components
const productList = () => import('./views/product-list.vue');
const productForm = () => import('./views/product-form.vue');

/**
 * Inventory presentation routes mounted under `/inventory`.
 * Fully compatible with PrimeFuel reference routes.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const inventoryRoutes = [
    { path: '', redirect: 'products' },
    { path: 'product-inventory', redirect: 'products' },
    { path: 'product-form', redirect: 'products/new' },
    { path: 'product-form/:id', redirect: to => `/inventory/products/${to.params.id}/edit` },
    { path: 'catalog', redirect: '/catalog' },
    { path: 'catalog/provider/:id', redirect: to => `/catalog/providers/${to.params.id}` },
    { path: 'products',          name: 'inventory-products',      component: productList, meta: { title: 'Product Inventory' } },
    { path: 'products/new',      name: 'inventory-product-new',   component: productForm, meta: { title: 'Add Product' } },
    { path: 'products/:id/edit', name: 'inventory-product-edit',  component: productForm, meta: { title: 'Edit Product' } }
];

export default inventoryRoutes;
