import { describe, it, expect, vi } from 'vitest';
import { BaseApi } from '../src/shared/infrastructure/base-api.js';
import { BaseEndpoint } from '../src/shared/infrastructure/base-endpoint.js';
import { registerFakeCollection, resetFakeDatabase } from '../src/shared/infrastructure/fake/fake-database.js';

describe('Shared API configuration', () => {
    it.each(['', '   '])('rejects an empty API URL (%j)', value => {
        vi.stubEnv('VITE_FULLTANK_API_URL', value);
        expect(() => new BaseApi()).toThrow('Missing API base URL');
    });

    it('accepts and trims an explicit API URL', () => {
        expect(new BaseApi(' https://example.test/api ').http.defaults.baseURL).toBe('https://example.test/api');
    });

    it('uses the configured demo adapter without a backend', async () => {
        const result = await new BaseApi().http.get('/api/v1/health');
        expect(result.data).toEqual({ status: 'ok', mode: 'demo' });
    });

    it('adds the IAM session token and tolerates invalid storage', async () => {
        const storage = { getItem: vi.fn(() => JSON.stringify({ token: 'demo-token' })) };
        vi.stubGlobal('localStorage', storage);
        try {
            const api = new BaseApi();
            expect((await api.http.get('/health')).config.headers.Authorization).toBe('Bearer demo-token');
            storage.getItem.mockReturnValue('invalid-json');
            expect((await api.http.get('/health')).status).toBe(200);
        } finally { vi.unstubAllGlobals(); }
    });
});

describe('Shared in-memory CRUD', () => {
    it('supports BaseEndpoint operations without loading any BC', async () => {
        registerFakeCollection('/sample-items', [{ id: 1, name: 'Seed', owner: 'buyer' }]);
        const endpoint = new BaseEndpoint(new BaseApi(), '/sample-items');
        expect((await endpoint.getAll()).data).toHaveLength(1);
        const created = (await endpoint.create({ name: 'New', owner: 'provider' })).data;
        expect(created.id).toBe(2);
        expect((await endpoint.getById(created.id)).data.name).toBe('New');
        expect((await endpoint.update(created.id, { name: 'Updated', id: 999 })).data).toMatchObject({ id: 2, name: 'Updated' });
        await endpoint.delete(created.id);
        await expect(endpoint.getById(created.id)).rejects.toMatchObject({ response: { status: 404 } });
    });

    it('filters queries and isolates response objects from stored data', async () => {
        registerFakeCollection('sample-items', [{ id: 1, owner: 'buyer' }, { id: 2, owner: 'provider' }]);
        const api = new BaseApi();
        const result = await api.http.get('/sample-items?owner=buyer');
        expect(result.data).toEqual([{ id: 1, owner: 'buyer' }]);
        result.data[0].owner = 'changed';
        expect((await api.http.get('/sample-items/1')).data.owner).toBe('buyer');
    });

    it('restores registered seeds after demo mutations', async () => {
        registerFakeCollection('/sample-items', [{ id: 1 }]);
        const endpoint = new BaseEndpoint(new BaseApi(), '/sample-items');
        await endpoint.delete(1);
        resetFakeDatabase();
        expect((await endpoint.getAll()).data).toEqual([{ id: 1 }]);
    });

    it('rejects unregistered endpoints instead of sending network requests', async () => {
        await expect(new BaseApi().http.get('/orders')).rejects.toMatchObject({ response: { status: 404 } });
    });

    it('rejects duplicate identifiers and unsupported operations', async () => {
        registerFakeCollection('/sample-items', [{ id: 1 }]);
        const api = new BaseApi();
        await expect(api.http.post('/sample-items', { id: 1 })).rejects.toMatchObject({ response: { status: 409 } });
        await expect(api.http.delete('/sample-items')).rejects.toMatchObject({ response: { status: 405 } });
    });
});
