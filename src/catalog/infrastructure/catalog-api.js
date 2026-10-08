import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const providerCompaniesPath = import.meta.env.VITE_PROVIDER_COMPANIES_ENDPOINT_PATH;
const inventoryPath = import.meta.env.VITE_INVENTORY_ENDPOINT_PATH;
const favoriteProvidersPath = import.meta.env.VITE_FAVORITE_PROVIDERS_ENDPOINT_PATH;
const providerRatingsPath = import.meta.env.VITE_PROVIDER_RATINGS_ENDPOINT_PATH;

/**
 * Infrastructure adapter for Catalog HTTP endpoints. The buyer catalog is
 * projected from the providers' real inventory (stock-aware), so products are
 * read from the inventory endpoint — the single source of truth for stock.
 *
 * @class CatalogApi
 * @extends BaseApi
 */
export class CatalogApi extends BaseApi {
    /** @type {BaseEndpoint} */
    #providersEndpoint;
    /** @type {BaseEndpoint} */
    #inventoryEndpoint;
    /** @type {BaseEndpoint} */
    #favoritesEndpoint;
    /** @type {BaseEndpoint} */
    #ratingsEndpoint;

    constructor() {
        super();
        this.#providersEndpoint = new BaseEndpoint(this, providerCompaniesPath);
        this.#inventoryEndpoint = new BaseEndpoint(this, inventoryPath);
        this.#favoritesEndpoint = new BaseEndpoint(this, favoriteProvidersPath);
        this.#ratingsEndpoint = new BaseEndpoint(this, providerRatingsPath);
    }

    getProviders() {
        return this.#providersEndpoint.getAll();
    }
    /** Provider inventory tanks projected as catalog products. */
    getProducts() { return this.#inventoryEndpoint.getAll(); }

    getFavorites(companyId) {
        if (!companyId) return Promise.resolve({ status: 200, data: [] });
        return this.http.get(favoriteProvidersPath, { params: { companyId } });
    }
    addFavorite(resource) { return this.#favoritesEndpoint.create(resource); }
    removeFavorite(id) { return this.#favoritesEndpoint.delete(id); }

    getRatings() { return this.#ratingsEndpoint.getAll(); }
    addRating(resource) { return this.#ratingsEndpoint.create(resource); }
    updateRating(id, resource) { return this.#ratingsEndpoint.update(id, resource); }
}
