import axios from 'axios';
import { createFakeAdapter } from './fake/fake-adapter.js';

/** Shared HTTP client. BC-specific APIs extend this class. */
export class BaseApi {
    #http;

    constructor(customBaseUrl = null) {
        const baseUrl = customBaseUrl ?? import.meta.env.VITE_FULLTANK_API_URL;
        if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
            throw new Error('[BaseApi] Missing API base URL: VITE_FULLTANK_API_URL is not configured.');
        }
        this.#http = axios.create({
            baseURL: baseUrl.trim(),
            ...(import.meta.env.VITE_USE_FAKE_API === 'true' ? { adapter: createFakeAdapter() } : {}),
        });
        this.#http.interceptors.request.use(config => {
            try {
                const session = JSON.parse(globalThis.localStorage?.getItem('fulltank.session') ?? '{}');
                if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
            } catch {
                // Invalid local storage must not prevent a request.
            }
            return config;
        });
    }

    get http() { return this.#http; }
}
