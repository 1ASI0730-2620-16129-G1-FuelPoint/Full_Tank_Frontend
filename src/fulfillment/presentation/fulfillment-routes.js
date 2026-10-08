// Lazy-loaded components
const vehicleList  = () => import('./views/vehicle-list.vue');
const vehicleForm  = () => import('./views/vehicle-form.vue');
const driverList   = () => import('./views/driver-list.vue');
const driverForm   = () => import('./views/driver-form.vue');

/**
 * Fulfillment presentation routes mounted under `/fulfillment`.
 * The Dispatch view was removed: dispatching now happens from Ordering.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const fulfillmentRoutes = [
    { path: 'vehicles',          name: 'fulfillment-vehicles',      component: vehicleList,  meta: { title: 'Fleet Management' } },
    { path: 'vehicles/new',      name: 'fulfillment-vehicle-new',   component: vehicleForm,  meta: { title: 'Add Vehicle' } },
    { path: 'vehicles/:id/edit', name: 'fulfillment-vehicle-edit',  component: vehicleForm,  meta: { title: 'Edit Vehicle' } },
    { path: 'drivers',           name: 'fulfillment-drivers',       component: driverList,   meta: { title: 'Driver Registry' } },
    { path: 'drivers/new',       name: 'fulfillment-driver-new',    component: driverForm,   meta: { title: 'Add Driver' } },
    { path: 'drivers/:id/edit',  name: 'fulfillment-driver-edit',   component: driverForm,   meta: { title: 'Edit Driver' } }
];

export default fulfillmentRoutes;