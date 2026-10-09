import { describe, expect, it, vi } from 'vitest';
import { createIamGuard } from '../src/iam/application/route-guard.js';

function session(role = null) {
    return { isAuthenticated: Boolean(role), role, isBuyer: role === 'BUYER', isProvider: role === 'PROVIDER', fetchCurrentUser: vi.fn().mockResolvedValue({}) };
}

describe('IAM route access', () => {
    it('redirects a guest to login and retains the requested profile path', async () => {
        const guard = createIamGuard(() => session());
        expect(await guard({ path: '/iam/profile', fullPath: '/iam/profile', meta: {} })).toEqual({ name: 'iam-login', query: { redirect: '/iam/profile' } });
    });
    it('keeps public home and 404 accessible without a session', async () => {
        const guard = createIamGuard(() => session());
        expect(await guard({ path: '/', meta: { public: true } })).toBe(true);
        expect(await guard({ path: '/missing', meta: { public: true } })).toBe(true);
    });
    it.each([['BUYER', '/inventory/products'], ['PROVIDER', '/equipment']])('keeps %s outside %s', async (role, path) => {
        const guard = createIamGuard(() => session(role));
        expect(await guard({ path, meta: {} })).toBe('/');
    });
    it('validates a persisted account once and permits its profile', async () => {
        const store = session('BUYER');
        const guard = createIamGuard(() => store);
        expect(await guard({ path: '/iam/profile', meta: {} })).toBe(true);
        expect(await guard({ path: '/iam/profile', meta: {} })).toBe(true);
        expect(store.fetchCurrentUser).toHaveBeenCalledTimes(1);
    });
    it('redirects a signed-in account away from guest-only login', async () => {
        expect(await createIamGuard(() => session('BUYER'))({ path: '/iam/login', meta: { public: true, guestOnly: true } })).toBe('/');
    });
    it('rejects a stale account after restore and respects explicit role restrictions', async () => {
        const store = session('BUYER');
        store.fetchCurrentUser.mockImplementation(async () => { store.isAuthenticated = false; });
        expect(await createIamGuard(() => store)({ path: '/iam/profile', meta: {} })).toMatchObject({ name: 'iam-login' });
        expect(await createIamGuard(() => session('BUYER'))({ path: '/restricted', meta: { roles: ['PROVIDER'] } })).toBe('/');
    });
});
