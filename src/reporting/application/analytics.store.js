import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AnalyticsApi } from '../infrastructure/analytics-api.js';

const analyticsApi = new AnalyticsApi();

const useAnalyticsStore = defineStore('analytics', () => {
    const buyerDashboard = ref(null);
    const providerDashboard = ref(null);
    const buyerReport = ref(null);
    const providerReport = ref(null);
    const loading = ref(false);
    const error = ref(null);

    async function load(work) {
        loading.value = true;
        error.value = null;
        try {
            return await work();
        } catch (err) {
            error.value = err;
            throw err;
        } finally {
            loading.value = false;
        }
    }

    function periodParams(year, zeroBasedMonth) {
        return {
            year: year ?? undefined,
            month: zeroBasedMonth == null ? undefined : Number(zeroBasedMonth) + 1,
        };
    }

    async function fetchBuyerDashboard(companyId) {
        return load(async () => {
            buyerDashboard.value = (await analyticsApi.getBuyerDashboard(companyId)).data;
            return buyerDashboard.value;
        });
    }

    async function fetchProviderDashboard(providerId) {
        return load(async () => {
            providerDashboard.value = (await analyticsApi.getProviderDashboard(providerId)).data;
            return providerDashboard.value;
        });
    }

    async function fetchBuyerReport(companyId, year, month) {
        return load(async () => {
            const [summary, trend, byProvider, byFuel, byEquipment] =
                await analyticsApi.getBuyerReport(companyId, periodParams(year, month));
            buyerReport.value = {
                summary: summary.data,
                trend: trend.data,
                byProvider: byProvider.data,
                byFuel: byFuel.data,
                byEquipment: byEquipment.data,
            };
            return buyerReport.value;
        });
    }

    async function fetchProviderReport(providerId, year, month) {
        return load(async () => {
            const [summary, trend, byFuel, byStatus, bySector, topCustomers] =
                await analyticsApi.getProviderReport(providerId, periodParams(year, month));
            providerReport.value = {
                summary: summary.data,
                trend: trend.data,
                byFuel: byFuel.data,
                byStatus: byStatus.data,
                bySector: bySector.data,
                topCustomers: topCustomers.data,
            };
            return providerReport.value;
        });
    }

    return {
        buyerDashboard,
        providerDashboard,
        buyerReport,
        providerReport,
        loading,
        error,
        fetchBuyerDashboard,
        fetchProviderDashboard,
        fetchBuyerReport,
        fetchProviderReport,
    };
});

export default useAnalyticsStore;
