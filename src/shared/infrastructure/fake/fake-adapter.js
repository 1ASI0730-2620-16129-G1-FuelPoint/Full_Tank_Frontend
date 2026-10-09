import { AxiosError } from 'axios';
import { findFakeCollection } from './fake-database.js';

function response(config, data, status = 200) {
    return { config, data: structuredClone(data), status, statusText: status === 201 ? 'Created' : 'OK', headers: {} };
}

function fail(config, status, message) {
    throw new AxiosError(message, AxiosError.ERR_BAD_REQUEST, config, null,
        { config, data: { message }, status, statusText: 'Error', headers: {} });
}

/** Generic in-memory CRUD only. Auth and business commands belong to later BC PRs. */
export function createFakeAdapter() {
    return async config => {
        const url = new URL(config.url ?? '/', 'http://fulltank.demo');
        const basePath = new URL(config.baseURL ?? '/', 'http://fulltank.demo').pathname.replace(/\/$/, '');
        let path = url.pathname.replace(/\/$/, '') || '/';
        if (basePath && (path === basePath || path.startsWith(basePath + '/'))) path = path.slice(basePath.length) || '/';
        const method = (config.method ?? 'get').toLowerCase();
        if (path === '/health' && method === 'get') return response(config, { status: 'ok', mode: 'demo' });

        let items = findFakeCollection(path);
        let id = null;
        if (!items) {
            const separator = path.lastIndexOf('/');
            items = findFakeCollection(path.slice(0, separator));
            id = decodeURIComponent(path.slice(separator + 1));
        }
        if (!items) return fail(config, 404, `Unregistered demo endpoint: ${path}`);
        const index = id === null ? -1 : items.findIndex(item => String(item.id) === id);
        if (id !== null && index === -1) return fail(config, 404, `Resource not found: ${path}`);

        if (method === 'get') {
            if (id !== null) return response(config, items[index]);
            const params = { ...Object.fromEntries(url.searchParams), ...config.params };
            return response(config, items.filter(item => Object.entries(params)
                .filter(([, value]) => value !== undefined && value !== null)
                .every(([key, value]) => String(item[key]) === String(value))));
        }
        let body = {};
        if (config.data) {
            try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data; }
            catch { return fail(config, 400, 'Invalid JSON body'); }
            if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(config, 400, 'An object body is required');
        }
        if (method === 'post' && id === null) {
            const nextId = Math.max(0, ...items.map(item => Number(item.id)).filter(Number.isFinite)) + 1;
            const item = { ...structuredClone(body), id: body.id ?? nextId };
            if (items.some(existing => String(existing.id) === String(item.id))) return fail(config, 409, 'Duplicate resource identifier');
            items.push(item);
            return response(config, item, 201);
        }
        if ((method === 'put' || method === 'patch') && id !== null) {
            items[index] = { ...items[index], ...structuredClone(body), id: items[index].id };
            return response(config, items[index]);
        }
        if (method === 'delete' && id !== null) return response(config, items.splice(index, 1)[0]);
        return fail(config, 405, `Unsupported demo operation: ${method} ${path}`);
    };
}
