import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";
import { registerIamDemo } from "./fake/iam-demo.js";

const usersPath = import.meta.env.VITE_USERS_ENDPOINT_PATH ?? "/users";
const authenticationPath = import.meta.env.VITE_AUTHENTICATION_ENDPOINT_PATH ?? "/authentication";
const buyerCompaniesPath = import.meta.env.VITE_BUYER_COMPANIES_ENDPOINT_PATH ?? "/buyer-companies";
const providerCompaniesPath = import.meta.env.VITE_PROVIDER_COMPANIES_ENDPOINT_PATH ?? "/provider-companies";

/**
 * IAM adapter. Companies and credentials share the `/users` collection.
 */
export class IamApi extends BaseApi {
    #usersEndpoint;
    #buyerCompaniesEndpoint;
    #providerCompaniesEndpoint;

    constructor() {
        super();
        if (import.meta.env.VITE_USE_FAKE_API === "true") {
            registerIamDemo({ usersPath, authenticationPath, buyerCompaniesPath, providerCompaniesPath });
        }
        this.#usersEndpoint = new BaseEndpoint(this, usersPath);
        this.#buyerCompaniesEndpoint = new BaseEndpoint(this, buyerCompaniesPath);
        this.#providerCompaniesEndpoint = new BaseEndpoint(this, providerCompaniesPath);
    }

    signIn(email, password) {
        return this.http.post(`${authenticationPath}/sign-in`, { email, password });
    }

    signUp(payload) {
        return this.http.post(`${authenticationPath}/sign-up`, payload);
    }

    getUserById(id) {
        return this.#usersEndpoint.getById(id);
    }

    updateUserProfile(id, payload) {
        return this.http.put(`${usersPath}/${id}/profile`, payload);
    }

    changePassword(id, payload) {
        return this.http.put(`${usersPath}/${id}/password`, payload);
    }

    getBuyerCompanies() {
        return this.#buyerCompaniesEndpoint.getAll();
    }

    getProviderCompanies() {
        return this.#providerCompaniesEndpoint.getAll();
    }

    getBuyerCompanyById(id) {
        return this.#buyerCompaniesEndpoint.getById(id);
    }

    getProviderCompanyById(id) {
        return this.#providerCompaniesEndpoint.getById(id);
    }

    createBuyerCompany(payload) {
        return this.#buyerCompaniesEndpoint.create(payload);
    }

    createProviderCompany(payload) {
        return this.#providerCompaniesEndpoint.create(payload);
    }

    updateBuyerCompany(id, payload) {
        return this.#buyerCompaniesEndpoint.update(id, payload);
    }

    updateProviderCompany(id, payload) {
        return this.#providerCompaniesEndpoint.update(id, payload);
    }
}
