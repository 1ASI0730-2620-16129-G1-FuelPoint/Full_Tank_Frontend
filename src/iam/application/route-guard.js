import useIamStore from './iam.store.js';
import pinia from '../../pinia.js';

const PROVIDER_ONLY = ['/inventory', '/fulfillment', '/reporting/provider', '/ordering/pending', '/ordering/orders', '/ordering/collections'];
const BUYER_ONLY = ['/catalog', '/equipment', '/payment', '/reporting/buyer', '/ordering/my-requests', '/ordering/my-orders'];
const matches = (path, prefixes) => prefixes.some(prefix => path === prefix || path.startsWith(prefix + '/'));

/** Validate a restored session and enforce access without importing other BCs. */
export function createIamGuard(getStore = () => useIamStore(pinia)) {
    let checkedStoredSession = false;
    return async to => {
        const store = getStore();
        if (!checkedStoredSession && store.isAuthenticated) {
            checkedStoredSession = true;
            await store.fetchCurrentUser();
        }
        if (to.meta?.guestOnly && store.isAuthenticated) return '/';
        if (to.meta?.public) return true;
        if (!store.isAuthenticated) return { name: 'iam-login', query: { redirect: to.fullPath ?? to.path } };
        if (to.meta?.roles && !to.meta.roles.includes(store.role)) return '/';
        if (store.isProvider && matches(to.path, BUYER_ONLY)) return '/';
        if (store.isBuyer && matches(to.path, PROVIDER_ONLY)) return '/';
        return true;
    };
}
