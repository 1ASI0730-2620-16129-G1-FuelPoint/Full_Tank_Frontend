const equipmentList = () => import('./views/equipment-list.vue');
const equipmentForm = () => import('./views/equipment-form.vue');

/**
 * Equipment presentation routes mounted under `/equipment` (buyer only).
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const equipmentRoutes = [
    { path: '', name: 'equipment-list', component: equipmentList, meta: { title: 'Equipment' } },
    { path: 'new', name: 'equipment-new', component: equipmentForm, meta: { title: 'Add Equipment' } },
    { path: ':id/edit', name: 'equipment-edit', component: equipmentForm, meta: { title: 'Edit Equipment' } },
];

export default equipmentRoutes;
