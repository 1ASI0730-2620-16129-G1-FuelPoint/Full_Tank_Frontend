import { BaseApi } from "../../shared/infrastructure/base-api.js";
import { BaseEndpoint } from "../../shared/infrastructure/base-endpoint.js";

const vehiclesEndpointPath = import.meta.env.VITE_VEHICLES_ENDPOINT_PATH;
const driversEndpointPath = import.meta.env.VITE_DRIVERS_ENDPOINT_PATH;
const deliveriesEndpointPath = import.meta.env.VITE_DELIVERIES_ENDPOINT_PATH;

/**
 * Infrastructure adapter for Fulfillment HTTP endpoints.
 *
 * @class FulfillmentApi
 * @extends BaseApi
 */
export class FulfillmentApi extends BaseApi {
    /** @type {BaseEndpoint} */
    #vehiclesEndpoint;
    /** @type {BaseEndpoint} */
    #driversEndpoint;
    /** @type {BaseEndpoint} */
    #deliveriesEndpoint;

    /** Creates endpoint clients for vehicles, drivers and deliveries resources. */
    constructor() {
        super();
        this.#vehiclesEndpoint = new BaseEndpoint(this, vehiclesEndpointPath);
        this.#driversEndpoint = new BaseEndpoint(this, driversEndpointPath);
        this.#deliveriesEndpoint = new BaseEndpoint(this, deliveriesEndpointPath);
    }

    // DELIVERIES
    getDeliveries() {
        return this.#deliveriesEndpoint.getAll();
    }

    createDelivery(resource) {
        return this.#deliveriesEndpoint.create(resource);
    }

    updateDelivery(resource) {
        if (String(resource.status).toLowerCase() === 'delivered') {
            return this.http.post(`${deliveriesEndpointPath}/${resource.id}/complete`);
        }
        return Promise.resolve({ status: 200, data: resource });
    }

    // VEHICLES
    getVehicles(providerId) {
        return this.http.get(`${vehiclesEndpointPath}/provider/${providerId}`);
    }

    getVehicleById(id) {
        return this.#vehiclesEndpoint.getById(id);
    }

    createVehicle(resource) {
        return this.#vehiclesEndpoint.create(resource);
    }

    updateVehicle(resource) {
        return this.#vehiclesEndpoint.update(resource.id, resource);
    }

    deleteVehicle(id) {
        return this.#vehiclesEndpoint.delete(id);
    }

    // DRIVERS
    getDrivers(providerId) {
        return this.http.get(`${driversEndpointPath}/provider/${providerId}`);
    }

    getDriverById(id) {
        return this.#driversEndpoint.getById(id);
    }

    createDriver(resource) {
        return this.#driversEndpoint.create(resource);
    }

    updateDriver(resource) {
        return this.#driversEndpoint.update(resource.id, resource);
    }

    deleteDriver(id) {
        return this.#driversEndpoint.delete(id);
    }
}
