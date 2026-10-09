import { beforeEach, describe, expect, it } from 'vitest';
import { IamApi } from '../src/iam/infrastructure/iam-api.js';

let api;
beforeEach(() => { api = new IamApi(); });
const buyer = 'logistics@transportesdelsur.com';
const provider = 'dispatch@petroandes.com';

describe('IAM demo API contract', () => {
    it.each([[buyer, 'BUYER'], [provider, 'PROVIDER']])('signs in %s and resolves its company', async (email, role) => {
        const { data: user } = await api.signIn(email.toUpperCase(), '123456');
        expect(user).toMatchObject({ role, token: expect.any(String), companyId: expect.any(Number) });
        expect(user.password).toBeUndefined();
        const { data: company } = role === 'BUYER'
            ? await api.getBuyerCompanyById(user.companyId) : await api.getProviderCompanyById(user.companyId);
        expect(company.name).toBe(user.name);
        expect(company.registrationToken).toBeUndefined();
    });
    it('rejects incorrect credentials', async () => {
        await expect(api.signIn(buyer, 'wrong')).rejects.toMatchObject({ response: { status: 401 } });
    });
    it.each(['BUYER', 'PROVIDER'])('registers a %s company before creating its account', async role => {
        const payload = { name: 'New Company', ruc: '20999999999', contactEmail: 'new@example.test' };
        const { data: company } = role === 'BUYER' ? await api.createBuyerCompany(payload) : await api.createProviderCompany(payload);
        await api.signUp({ role, email: 'new@example.test', password: 'new-password', companyId: company.id, registrationToken: company.registrationToken });
        const { data: account } = await api.signIn('new@example.test', 'new-password');
        expect(account).toMatchObject({ companyId: company.id, role });
        expect(account.password).toBeUndefined();
    });
    it('rejects a forged registration token and duplicate email', async () => {
        const { data: company } = await api.createBuyerCompany({ name: 'New Company', ruc: '20999999999' });
        const payload = { role: 'BUYER', email: 'new@example.test', password: 'new-password', companyId: company.id };
        await expect(api.signUp({ ...payload, registrationToken: 'forged' })).rejects.toMatchObject({ response: { status: 400 } });
        await expect(api.signUp({ ...payload, email: buyer, registrationToken: company.registrationToken })).rejects.toMatchObject({ response: { status: 409, data: { code: 'iam.email-exists' } } });
    });
    it('rejects duplicate company RUC', async () => {
        const { data: user } = await api.signIn(buyer, '123456');
        const { data: company } = await api.getBuyerCompanyById(user.companyId);
        await expect(api.createBuyerCompany({ name: 'Duplicate', ruc: company.ruc })).rejects.toMatchObject({ response: { status: 409, data: { code: 'iam.ruc-exists' } } });
    });
    it('updates email without accepting a role change', async () => {
        const { data: user } = await api.signIn(buyer, '123456');
        const { data: updated } = await api.updateUserProfile(user.id, { email: 'updated@example.test', role: 'PROVIDER' });
        expect(updated).toMatchObject({ email: 'updated@example.test', role: 'BUYER', companyId: user.companyId });
        expect((await api.signIn('updated@example.test', '123456')).data.id).toBe(user.id);
        expect(updated.password).toBeUndefined();
    });
    it('changes a password only after checking the current one', async () => {
        const { data: user } = await api.signIn(buyer, '123456');
        await expect(api.changePassword(user.id, { currentPassword: 'wrong', newPassword: 'new-secret' })).rejects.toMatchObject({ response: { status: 401 } });
        await api.changePassword(user.id, { currentPassword: '123456', newPassword: 'new-secret' });
        await expect(api.signIn(buyer, '123456')).rejects.toMatchObject({ response: { status: 401 } });
        expect((await api.signIn(buyer, 'new-secret')).data.id).toBe(user.id);
    });
    it('updates company fields and keeps the user company identity', async () => {
        const { data: user } = await api.signIn(buyer, '123456');
        const { data: company } = await api.updateBuyerCompany(user.companyId, { name: 'Updated Company', id: 999 });
        expect(company).toMatchObject({ id: user.companyId, name: 'Updated Company' });
        expect((await api.getUserById(user.id)).data).toMatchObject({ name: 'Updated Company', companyId: user.companyId });
    });
});
