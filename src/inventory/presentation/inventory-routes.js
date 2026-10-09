// Lazy-loaded components
const productList = () => import('./views/product-list.vue');
const productForm = () => import('./views/product-form.vue');

/**
 * Inventory presentation routes mounted under `/inventory`.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const inventoryRoutes = [
    { path: 'products',          name: 'inventory-products',      component: productList, meta: { title: 'Product Inventory' } },
    { path: 'products/new',      name: 'inventory-product-new',   component: productForm, meta: { title: 'Add Product' } },
    { path: 'products/:id/edit', name: 'inventory-product-edit',  component: productForm, meta: { title: 'Edit Product' } }
];

export default inventoryRoutes;