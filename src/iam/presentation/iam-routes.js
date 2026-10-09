const loginView = () => import('./views/login-view.vue');
const registerView = () => import('./views/register-view.vue');
const profileView = () => import('./views/profile-view.vue');
const roleSelection = () => import('./views/role-selection.vue');

/**
 * IAM presentation routes mounted under `/iam`.
 *
 * - `login` / `register` are public and render without the app shell.
 * - `profile` requires an active session and renders inside the layout shell.
 * - `demo` keeps the original segment-selection screen as an optional demo.
 *
 * @type {import('vue-router').RouteRecordRaw[]}
 */
const iamRoutes = [
    { path: '', redirect: { name: 'iam-login' } },
    { path: 'login', name: 'iam-login', component: loginView, meta: { title: 'Sign In', public: true } },
    { path: 'register', name: 'iam-register', component: registerView, meta: { title: 'Sign Up', public: true } },
    { path: 'profile', name: 'iam-profile', component: profileView, meta: { title: 'My Profile' } },
    { path: 'demo', name: 'iam-role-selection', component: roleSelection, meta: { title: 'Select Segment', public: true } },
];

export default iamRoutes;
