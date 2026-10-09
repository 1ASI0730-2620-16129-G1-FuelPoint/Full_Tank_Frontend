/**
 * Application service store for the `Fulfillment` bounded context.
 * Manages vehicles and drivers for fuel delivery fleet.
 *
 * @module useFulfillmentStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { FulfillmentApi } from "../infrastructure/fulfillment-api.js";
import { VehicleAssembler } from "../infrastructure/vehicle.assembler.js";
import { DriverAssembler } from "../infrastructure/driver.assembler.js";
import { Vehicle } from "../domain/model/vehicle.entity.js";
import { Driver } from "../domain/model/driver.entity.js";

const fulfillmentApi = new FulfillmentApi();

const useFulfillmentStore = defineStore('fulfillment', () => {
    /** @type {import('vue').Ref<Vehicle[]>} */
    const vehicles = ref([]);
    /** @type {import('vue').Ref<Driver[]>} */
    const drivers = ref([]);
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const vehiclesLoaded = ref(false);
    /** @type {import('vue').Ref<boolean>} */
    const driversLoaded = ref(false);
    /** @type {import('vue').Ref<number|string|null>} */
    const vehiclesProviderId = ref(null);
    /** @type {import('vue').Ref<number|string|null>} */
    const driversProviderId = ref(null);
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);

    /** @type {import('vue').ComputedRef<number>} */
    const vehiclesCount = computed(() => vehiclesLoaded.value ? vehicles.value.length : 0);
    /** @type {import('vue').ComputedRef<number>} */
    const driversCount = computed(() => driversLoaded.value ? drivers.value.length : 0);

    // VEHICLES
    async function fetchVehicles(providerId) {
        if (providerId == null) {
            vehicles.value = [];
            vehiclesLoaded.value = true;
            vehiclesProviderId.value = null;
            return;
        }
        loading.value = true;
        return fulfillmentApi.getVehicles(providerId).then(response => {
            vehicles.value = VehicleAssembler.toEntitiesFromResponse(response);
            vehiclesLoaded.value = true;
            vehiclesProviderId.value = providerId;
        }).catch(error => {
            errors.value.push(error);
        }).finally(() => {
            loading.value = false;
        });
    }

    function getVehicleById(id) {
        const idNum = parseInt(id);
        return vehicles.value.find(v => v.id === idNum || v.id === id);
    }

    function addVehicle(vehicle) {
        if (vehicle.providerId == null) {
            const error = new Error('Vehicle owner providerId is required');
            errors.value.push(error);
            return Promise.resolve(null);
        }
        return fulfillmentApi.createVehicle(vehicle).then(response => {
            const newVehicle = VehicleAssembler.toEntityFromResource(response.data);
            vehicles.value.push(newVehicle);
        }).catch(error => {
            errors.value.push(error);
        });
    }

    function updateVehicle(vehicle) {
        const existing = getVehicleById(vehicle.id);
        if (!existing || String(existing.providerId) !== String(vehicle.providerId)) {
            const error = new Error('Vehicle does not belong to the current provider');
            errors.value.push(error);
            return Promise.resolve(null);
        }
        return fulfillmentApi.updateVehicle(vehicle).then(response => {
            const updated = VehicleAssembler.toEntityFromResource(response.data);
            const index = vehicles.value.findIndex(v => v.id === updated.id);
            if (index !== -1) vehicles.value[index] = updated;
        }).catch(error => {
            errors.value.push(error);
        });
    }

    function deleteVehicle(vehicle) {
        const existing = getVehicleById(vehicle.id);
        if (!existing || String(existing.providerId) !== String(vehicle.providerId)) {
            const error = new Error('Vehicle does not belong to the current provider');
            errors.value.push(error);
            return Promise.resolve(null);
        }
        return fulfillmentApi.deleteVehicle(vehicle.id).then(() => {
            const index = vehicles.value.findIndex(v => v.id === vehicle.id);
            if (index !== -1) vehicles.value.splice(index, 1);
        }).catch(error => {
            errors.value.push(error);
        });
    }

    // DRIVERS
    async function fetchDrivers(providerId) {
        if (providerId == null) {
            drivers.value = [];
            driversLoaded.value = true;
            driversProviderId.value = null;
            return;
        }
        loading.value = true;
        return fulfillmentApi.getDrivers(providerId).then(response => {
            drivers.value = DriverAssembler.toEntitiesFromResponse(response);
            driversLoaded.value = true;
            driversProviderId.value = providerId;
        }).catch(error => {
            errors.value.push(error);
        }).finally(() => {
            loading.value = false;
        });
    }

    function getDriverById(id) {
        const idNum = parseInt(id);
        return drivers.value.find(d => d.id === idNum || d.id === id);
    }

    function addDriver(driver) {
        if (driver.providerId == null) {
            const error = new Error('Driver owner providerId is required');
            errors.value.push(error);
            return Promise.resolve(null);
        }
        return fulfillmentApi.createDriver(driver).then(response => {
            const newDriver = DriverAssembler.toEntityFromResource(response.data);
            drivers.value.push(newDriver);
        }).catch(error => {
            errors.value.push(error);
        });
    }

    function updateDriver(driver) {
        const existing = getDriverById(driver.id);
        if (!existing || String(existing.providerId) !== String(driver.providerId)) {
            const error = new Error('Driver does not belong to the current provider');
            errors.value.push(error);
            return Promise.resolve(null);
        }
        return fulfillmentApi.updateDriver(driver).then(response => {
            const updated = DriverAssembler.toEntityFromResource(response.data);
            const index = drivers.value.findIndex(d => d.id === updated.id);
            if (index !== -1) drivers.value[index] = updated;
        }).catch(error => {
            errors.value.push(error);
        });
    }

    function deleteDriver(driver) {
        const existing = getDriverById(driver.id);
        if (!existing || String(existing.providerId) !== String(driver.providerId)) {
            const error = new Error('Driver does not belong to the current provider');
            errors.value.push(error);
            return Promise.resolve(null);
        }
        return fulfillmentApi.deleteDriver(driver.id).then(() => {
            const index = drivers.value.findIndex(d => d.id === driver.id);
            if (index !== -1) drivers.value.splice(index, 1);
        }).catch(error => {
            errors.value.push(error);
        });
    }

    // ── Deliveries ────────────────────────────────────────────────────────
    /** @type {import('vue').Ref<Array>} */
    const deliveries = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const deliveriesLoaded = ref(false);

    /** @type {import('vue').ComputedRef<Array>} */
    const availableVehicles = computed(() => vehicles.value.filter(v => v.status === 'AVAILABLE'));
    /** @type {import('vue').ComputedRef<Array>} */
    const availableDrivers = computed(() => drivers.value.filter(d => d.status === 'AVAILABLE'));
    /** @type {import('vue').ComputedRef<Array>} */
    const activeDeliveries = computed(() =>
        deliveries.value.filter(d => d.status === 'pending' || d.status === 'on_the_way')
    );

    function fetchDeliveries() {
        return fulfillmentApi.getDeliveries()
            .then(response => {
                deliveries.value = Array.isArray(response.data) ? response.data : [];
                deliveriesLoaded.value = true;
            })
            .catch(error => { errors.value.push(error); });
    }

    function setVehicleStatus(vehicleId, status) {
        const vehicle = getVehicleById(vehicleId);
        if (!vehicle) return;
        return updateVehicle({ ...vehicle, status });
    }

    function setDriverStatus(driverId, status) {
        const driver = getDriverById(driverId);
        if (!driver) return;
        return updateDriver({ ...driver, status });
    }

    /**
     * Assigns a driver + vehicle to an order and opens a delivery record.
     * Called by the coordination service when dispatching an order.
     *
     * @param {{ order:Object, driverId:number, vehicleId:number }} params
     * @returns {Promise<Object>}
     */
    async function assignToOrder({ order, driverId, vehicleId }) {
        const vehicle = getVehicleById(vehicleId);
        const driver = getDriverById(driverId);
        const ownsVehicle = vehicle && String(vehicle.providerId) === String(order.providerId);
        const ownsDriver = driver && String(driver.providerId) === String(order.providerId);
        if (!ownsVehicle || !ownsDriver) {
            throw new Error('Fulfillment resources do not belong to the order provider');
        }

        await setVehicleStatus(vehicleId, 'ASSIGNED');
        await setDriverStatus(driverId, 'ASSIGNED');

        const delivery = {
            orderId: order.id,
            providerId: order.providerId,
            driverId,
            vehicleId,
            status: 'on_the_way',
            originLocation: 'Provider Terminal',
            destinationLocation: order.deliveryAddress,
            dispatchedAt: new Date().toISOString(),
            deliveredAt: null,
            notes: '',
        };
        try {
            const response = await fulfillmentApi.createDelivery(delivery);
            const created = response.data ?? delivery;
            deliveries.value.push(created);
            return created;
        } catch (error) {
            errors.value.push(error);
            await setVehicleStatus(vehicleId, 'AVAILABLE');
            await setDriverStatus(driverId, 'AVAILABLE');
            return null;
        }
    }

    /**
     * Updates a delivery status and frees resources when completed.
     * @param {Object} delivery
     * @param {string} status - pending | on_the_way | delivered | problem | cancelled
     */
    async function updateDeliveryStatus(delivery, status) {
        const patch = { ...delivery, status };
        if (status === 'delivered') patch.deliveredAt = new Date().toISOString();
        const index = deliveries.value.findIndex(d => d.id === delivery.id);
        if (index !== -1) deliveries.value[index] = patch;

        try {
            const response = await fulfillmentApi.updateDelivery(patch);
            const persisted = response.data ?? patch;
            if (index !== -1) deliveries.value[index] = persisted;
        } catch (error) {
            if (index !== -1) deliveries.value[index] = delivery;
            errors.value.push(error);
            return null;
        }

        if (status === 'delivered' || status === 'cancelled') {
            if (delivery.vehicleId) setVehicleStatus(delivery.vehicleId, 'AVAILABLE');
            if (delivery.driverId) setDriverStatus(delivery.driverId, 'AVAILABLE');
        }
        return deliveries.value[index] ?? patch;
    }

    /**
     * Completes the delivery tied to an order: marks it delivered, stamps
     * deliveredAt and frees the assigned driver + vehicle. Called when the buyer
     * confirms reception, so fulfillment stays consistent with ordering.
     * @param {number|string} orderId
     * @returns {Promise<void>}
     */
    async function completeDeliveryForOrder(orderId) {
        if (!deliveriesLoaded.value) await fetchDeliveries();
        const delivery = deliveries.value.find(
            d => d.orderId === orderId && d.status !== 'delivered' && d.status !== 'cancelled'
        );
        if (delivery) await updateDeliveryStatus(delivery, 'delivered');
    }

    function clearErrors() {
        errors.value = [];
    }

    return {
        vehicles,
        drivers,
        deliveries,
        errors,
        vehiclesLoaded,
        driversLoaded,
        vehiclesProviderId,
        driversProviderId,
        deliveriesLoaded,
        loading,
        vehiclesCount,
        driversCount,
        availableVehicles,
        availableDrivers,
        activeDeliveries,
        fetchVehicles,
        getVehicleById,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        fetchDrivers,
        getDriverById,
        addDriver,
        updateDriver,
        deleteDriver,
        fetchDeliveries,
        setVehicleStatus,
        setDriverStatus,
        assignToOrder,
        updateDeliveryStatus,
        completeDeliveryForOrder,
        clearErrors
    };
});

export default useFulfillmentStore;
