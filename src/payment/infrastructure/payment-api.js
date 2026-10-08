import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const paymentsEndpointPath = import.meta.env.VITE_PAYMENTS_ENDPOINT_PATH;
const invoicesEndpointPath = import.meta.env.VITE_INVOICES_ENDPOINT_PATH;
const checkoutEndpointPath = import.meta.env.VITE_PAYMENT_CHECKOUT_ENDPOINT_PATH;

/**
 * Infrastructure adapter for Payment HTTP endpoints (payments + invoices).
 *
 * @class PaymentApi
 * @extends BaseApi
 */
export class PaymentApi extends BaseApi {
    /** @type {BaseEndpoint} */
    #paymentsEndpoint;
    /** @type {BaseEndpoint} */
    #invoicesEndpoint;
    /** @type {BaseEndpoint} */
    #checkoutEndpoint;

    constructor() {
        super();
        this.#paymentsEndpoint = new BaseEndpoint(this, paymentsEndpointPath);
        this.#invoicesEndpoint = new BaseEndpoint(this, invoicesEndpointPath);
        this.#checkoutEndpoint = new BaseEndpoint(this, checkoutEndpointPath);
    }

    getPayments() { return this.#paymentsEndpoint.getAll(); }
    createPayment(resource) { return this.#paymentsEndpoint.create(resource); }

    getInvoices() { return this.#invoicesEndpoint.getAll(); }
    createInvoice(resource) { return this.#invoicesEndpoint.create(resource); }
    checkout(payment, invoice) {
        return this.#checkoutEndpoint.create({ payment, invoice });
    }
}
