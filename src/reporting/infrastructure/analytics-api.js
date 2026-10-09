import { BaseApi } from '../../shared/infrastructure/base-api.js';

const analyticsPath = import.meta.env.VITE_ANALYTICS_ENDPOINT_PATH;

export class AnalyticsApi extends BaseApi {
    getBuyerDashboard(companyId) {
        return this.http.get(`${analyticsPath}/buyer-dashboard/${companyId}`);
    }

    getProviderDashboard(providerId) {
        return this.http.get(`${analyticsPath}/provider-dashboard/${providerId}`);
    }

    getBuyerReport(companyId, period) {
        const base = `${analyticsPath}/buyer/${companyId}`;
        const config = { params: period };
        return Promise.all([
            this.http.get(`${base}/spending-summary`, config),
            this.http.get(`${base}/monthly-spending`, config),
            this.http.get(`${base}/spending-by-provider`, config),
            this.http.get(`${base}/spending-by-fuel-type`, config),
            this.http.get(`${base}/spending-by-equipment`, config),
        ]);
    }

    getProviderReport(providerId, period) {
        const base = `${analyticsPath}/provider/${providerId}`;
        const config = { params: period };
        return Promise.all([
            this.http.get(`${base}/sales-summary`, config),
            this.http.get(`${base}/revenue-over-time`, config),
            this.http.get(`${base}/revenue-by-fuel-type`, config),
            this.http.get(`${base}/orders-by-status`, config),
            this.http.get(`${base}/customers-by-sector`, config),
            this.http.get(`${base}/top-customers`, config),
        ]);
    }
}
