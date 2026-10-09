import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import useIamStore from '../src/iam/application/iam.store.js';

beforeEach(() => { setActivePinia(createPinia()); });

describe('IAM session integration with demo API', () => {
    it('persists a buyer session and restores it with the company identity', async () => {
        const store = useIamStore();
        await store.login('logistics@transportesdelsur.com', '123456');
        const id = store.currentCompanyId;
        expect(store.isBuyer).toBe(true);
        expect(store.isAuthenticated).toBe(true);
        expect(JSON.parse(localStorage.getItem('fulltank.session'))).toMatchObject({ companyId: id, role: 'BUYER' });
        setActivePinia(createPinia());
        const restored = useIamStore();
        expect(restored.isAuthenticated).toBe(true);
        await restored.fetchCurrentUser();
        expect(restored.currentCompany.id).toBe(id);
        restored.logout();
        expect(restored.isAuthenticated).toBe(false);
        expect(localStorage.getItem('fulltank.session')).toBeNull();
    });
    it('rejects invalid credentials without creating a session', async () => {
        const store = useIamStore();
        await expect(store.login('logistics@transportesdelsur.com', 'wrong')).rejects.toThrow('iam.invalid-credentials');
        expect(store.isAuthenticated).toBe(false);
        expect(store.loading).toBe(false);
    });
    it('registers a provider and resolves its authenticated company', async () => {
        const store = useIamStore();
        await store.register({ role: 'PROVIDER', companyName: 'New Supplier', ruc: '20999999999',
            address: 'Lima', phone: '999999999', email: 'new-provider@example.test', password: 'new-secret' });
        expect(store.isProvider).toBe(true);
        expect(store.currentProviderId).toBe(store.currentCompany.id);
        expect(store.currentCompanyId).toBeNull();
    });
    it('updates the company name, account email and password across the session', async () => {
        const store = useIamStore();
        await store.login('logistics@transportesdelsur.com', '123456');
        await store.updateCompanyProfile({ companyName: 'Updated Buyer', ruc: store.currentCompany.ruc,
            address: 'Lima', phone: '999999999', sector: 'TRANSPORT' });
        expect(store.displayName).toBe('Updated Buyer');
        await store.updateProfile({ email: 'updated-buyer@example.test' });
        expect(store.email).toBe('updated-buyer@example.test');
        await expect(store.changePassword({ currentPassword: 'wrong', newPassword: 'new-secret', confirmNewPassword: 'new-secret' })).rejects.toThrow('iam.invalid-current-password');
        await store.changePassword({ currentPassword: '123456', newPassword: 'new-secret', confirmNewPassword: 'new-secret' });
        store.logout();
        await store.login('updated-buyer@example.test', 'new-secret');
        expect(store.displayName).toBe('Updated Buyer');
    });
    it('distinguishes duplicate RUC from duplicate credentials', async () => {
        const store = useIamStore();
        await store.login('logistics@transportesdelsur.com', '123456');
        const ruc = store.currentCompany.ruc;
        await expect(store.register({ role: 'BUYER', companyName: 'Duplicate', ruc,
            email: 'another@example.test', password: 'new-secret' })).rejects.toThrow('iam.ruc-exists');
    });
    it('ignores malformed stored sessions and clears an invalid stored user', async () => {
        localStorage.setItem('fulltank.session', 'invalid-json');
        expect(useIamStore().isAuthenticated).toBe(false);
        localStorage.setItem('fulltank.session', JSON.stringify({ userId: 999999, companyId: 999999, role: 'BUYER', token: 'stale-token' }));
        setActivePinia(createPinia());
        const store = useIamStore();
        expect(await store.fetchCurrentUser()).toBeNull();
        expect(store.isAuthenticated).toBe(false);
        expect(localStorage.getItem('fulltank.session')).toBeNull();
    });
});
