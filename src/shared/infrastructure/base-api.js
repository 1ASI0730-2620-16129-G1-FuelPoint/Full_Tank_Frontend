import axios from "axios";
import { createFakeAdapter } from "./fake/fake-adapter.js";

const sessionStorageKey = 'fulltank.session';
const useFakeApi = import.meta.env?.VITE_USE_FAKE_API === 'true';

/**
 * Shared infrastructure base class that owns the configured Axios client.
 * Bounded-context adapters extend this class to access a consistent HTTP gateway.
 *
 * @class BaseApi
 */
export class BaseApi {
    /** @type {import('axios').AxiosInstance} */
    #http;

    /** Initializes the shared Axios client with environment-driven configuration. */
    constructor(customBaseUrl = null) {
        const rawBaseUrl = customBaseUrl ?? import.meta.env?.VITE_FULLTANK_API_URL;
        if (!rawBaseUrl || typeof rawBaseUrl !== 'string' || !rawBaseUrl.trim()) {
            throw new Error('[BaseApi] Missing API base URL: VITE_FULLTANK_API_URL is not configured.');
        }

        this.#http = axios.create({
            baseURL: rawBaseUrl.trim(),
            ...(useFakeApi ? { adapter: createFakeAdapter() } : {}),
        });

        this.#http.interceptors.request.use(config => {
            try {
                const session = JSON.parse(localStorage.getItem(sessionStorageKey) ?? '{}');
                if (session.token) {
                    config.headers.Authorization = `Bearer ${session.token}`;
                }
            } catch {
                // A malformed local session must not prevent public requests.
            }
            return config;
        });
    }

    /**
     * Axios client used by infrastructure endpoint adapters.
     * @returns {import('axios').AxiosInstance}
     */
    get http() {
        return this.#http;
    }
}
