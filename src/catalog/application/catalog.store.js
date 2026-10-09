/**
 * Application service store for the Catalog bounded context (buyer only).
 *
 * Provides the buyer's read view of providers + their products and manages
 * favorites. It does NOT create requests itself: the catalog page emits an
 * event and the shared coordination service creates the request in Ordering.
 *
 * @module useCatalogStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { CatalogApi } from "../infrastructure/catalog-api.js";
import { CatalogAssembler } from "../infrastructure/catalog.assembler.js";

const catalogApi = new CatalogApi();

const useCatalogStore = defineStore('catalog', () => {
    /** @type {import('vue').Ref<import('../domain/model/provider.entity.js').Provider[]>} */
    const providers = ref([]);
    /** @type {import('vue').Ref<import('../domain/model/catalog-product.entity.js').CatalogProduct[]>} */
    const products = ref([]);
    /** @type {import('vue').Ref<Array>} */
    const favorites = ref([]);
    /** @type {import('vue').Ref<Array>} */
    const ratings = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const loaded = ref(false);
    /** @type {import('vue').Ref<number|string|null>} */
    const loadedCompanyId = ref(null);
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);

    function fetchCatalog(companyId = null) {
        loading.value = true;
        return Promise.all([
            catalogApi.getProviders(),
            catalogApi.getProducts(),
            catalogApi.getFavorites(companyId).catch(error => {
                errors.value.push(error);
                return { data: [] };
            }),
            catalogApi.getRatings().catch(error => {
                errors.value.push(error);
                return { data: [] };
            }),
        ])
            .then(([providersRes, productsRes, favoritesRes, ratingsRes]) => {
                providers.value = CatalogAssembler.toProvidersFromResponse(providersRes);
                products.value = CatalogAssembler.toProductsFromResponse(productsRes);
                ratings.value = Array.isArray(ratingsRes.data) ? ratingsRes.data : [];
                providers.value.forEach(provider => {
                    provider.fuelTypesOffered = [...new Set(
                        products.value
                            .filter(product => product.active && Number(product.providerId) === Number(provider.id))
                            .map(product => product.fuelType)
                            .filter(Boolean),
                    )];
                    refreshProviderRating(provider.id);
                });
                favorites.value = Array.isArray(favoritesRes.data) ? favoritesRes.data : [];
                loaded.value = true;
                loadedCompanyId.value = companyId;
            })
            .catch(error => errors.value.push(error))
            .finally(() => { loading.value = false; });
    }

    function getProviderById(id) {
        const idNum = parseInt(id);
        return providers.value.find(p => p.id === idNum || p.id === id);
    }

    /** @param {number} providerId @returns {Array} */
    function productsForProvider(providerId) {
        const id = Number(providerId);
        return products.value.filter(p => Number(p.providerId) === id);
    }

    /**
     * Filtered provider list for the catalog grid.
     * @param {{ search?:string, fuelType?:string, onlyFavorites?:boolean, companyId?:number, compatibleTypes?:string[] }} options
     * @returns {Array}
     */
    function filteredProviders(options = {}) {
        const { search = '', fuelType = '', onlyFavorites = false, companyId = null, compatibleTypes = null } = options;
        const term = search.trim().toLowerCase();
        return providers.value.filter(provider => {
            if (term && !provider.name.toLowerCase().includes(term)) return false;
            if (fuelType && !provider.offers(fuelType)) return false;
            if (compatibleTypes && compatibleTypes.length &&
                !compatibleTypes.some(ft => provider.offers(ft))) return false;
            if (onlyFavorites && companyId && !isFavorite(companyId, provider.id)) return false;
            return true;
        });
    }

    /** @param {number} companyId @param {number} providerId @returns {boolean} */
    function isFavorite(companyId, providerId) {
        return favorites.value.some(f => f.companyId === companyId && f.providerId === providerId);
    }

    function refreshProviderRating(providerId) {
        const provider = getProviderById(providerId);
        if (!provider) return;
        const providerRatings = ratings.value.filter(
            item => Number(item.providerId) === Number(providerId),
        );
        provider.ratingsCount = providerRatings.length;
        provider.rating = providerRatings.length
            ? Number((
                providerRatings.reduce((sum, item) => sum + Number(item.rating), 0)
                / providerRatings.length
            ).toFixed(1))
            : 0;
    }

    function ratingForBuyer(companyId, providerId) {
        return ratings.value.find(
            item => Number(item.companyId) === Number(companyId)
                && Number(item.providerId) === Number(providerId),
        )?.rating ?? 0;
    }

    async function rateProvider(companyId, providerId, rating) {
        const value = Math.min(5, Math.max(1, Number(rating)));
        const existing = ratings.value.find(
            item => Number(item.companyId) === Number(companyId)
                && Number(item.providerId) === Number(providerId),
        );
        const now = new Date().toISOString();
        const payload = {
            ...(existing ?? {}),
            companyId,
            providerId,
            rating: value,
            updatedAt: now,
        };

        try {
            const { data } = existing
                ? await catalogApi.updateRating(existing.id, payload)
                : await catalogApi.addRating({ ...payload, createdAt: now });
            if (existing) {
                const index = ratings.value.findIndex(item => item.id === existing.id);
                ratings.value[index] = data;
            } else {
                ratings.value.push(data);
            }
            refreshProviderRating(providerId);
            return data;
        } catch (error) {
            errors.value.push(error);
            return null;
        }
    }

    /**
     * Toggles a provider as favorite for a buyer company.
     * @param {number} companyId
     * @param {number} providerId
     */
    async function toggleFavorite(companyId, providerId) {
        const existing = favorites.value.find(f => f.companyId === companyId && f.providerId === providerId);
        if (existing) {
            favorites.value = favorites.value.filter(f => f !== existing);
            try {
                await catalogApi.removeFavorite(existing.id);
            } catch (e) {
                errors.value.push(e);
                favorites.value.push(existing);
            }
        } else {
            const draft = { companyId, providerId, createdAt: new Date().toISOString() };
            try {
                const res = await catalogApi.addFavorite(draft);
                favorites.value.push(res.data ?? draft);
            } catch (e) {
                errors.value.push(e);
            }
        }
    }

    /** @type {import('vue').ComputedRef<number>} */
    const providersCount = computed(() => providers.value.length);

    function clearErrors() { errors.value = []; }

    return {
        providers,
        products,
        favorites,
        ratings,
        loaded,
        loadedCompanyId,
        loading,
        errors,
        providersCount,
        fetchCatalog,
        getProviderById,
        productsForProvider,
        filteredProviders,
        isFavorite,
        toggleFavorite,
        ratingForBuyer,
        rateProvider,
        clearErrors,
    };
});

export default useCatalogStore;
