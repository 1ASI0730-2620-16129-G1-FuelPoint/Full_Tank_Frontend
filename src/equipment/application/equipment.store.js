/**
 * Application service store for the Equipment bounded context (buyer only).
 *
 * Owns the buyer's equipment aggregate, favorites and refill history. It never
 * reaches into Catalog/Ordering/Inventory: refill *requests* are orchestrated by
 * the shared coordination service, which then calls {@link applyRefill} here.
 *
 * @module useEquipmentStore
 */
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { EquipmentApi } from "../infrastructure/equipment-api.js";
import { EquipmentAssembler } from "../infrastructure/equipment.assembler.js";
import { Equipment } from "../domain/model/equipment.entity.js";
import { toLiters, fromLiters } from "../../shared/domain/helpers.js";

const equipmentApi = new EquipmentApi();

const useEquipmentStore = defineStore('equipment', () => {
    /** @type {import('vue').Ref<Equipment[]>} */
    const equipment = ref([]);
    /** @type {import('vue').Ref<Array>} */
    const favoriteProviders = ref([]);
    /** @type {import('vue').Ref<Array>} */
    const refillHistory = ref([]);
    /** @type {import('vue').Ref<boolean>} */
    const loaded = ref(false);
    /** @type {import('vue').Ref<boolean>} */
    const loading = ref(false);
    /** @type {import('vue').Ref<Error[]>} */
    const errors = ref([]);

    /**
     * Equipment owned by a given buyer company.
     * @param {number} companyId
     * @returns {Equipment[]}
     */
    function forCompany(companyId) {
        return equipment.value.filter(e => e.companyId === companyId);
    }

    /**
     * Equipment that is at/below its refill threshold for a company.
     * @param {number} companyId
     * @returns {Equipment[]}
     */
    function needingRefill(companyId) {
        return forCompany(companyId).filter(e => e.needsRefill());
    }

    function fetchEquipment() {
        loading.value = true;
        return equipmentApi.getEquipment()
            .then(response => {
                equipment.value = EquipmentAssembler.toEntitiesFromResponse(response);
                loaded.value = true;
            })
            .catch(error => { errors.value.push(error); })
            .finally(() => { loading.value = false; });
    }

    function fetchFavoriteProviders() {
        return equipmentApi.getFavoriteProviders()
            .then(response => { favoriteProviders.value = Array.isArray(response.data) ? response.data : []; })
            .catch(error => { errors.value.push(error); });
    }

    function fetchRefillHistory() {
        return equipmentApi.getRefillHistory()
            .then(response => { refillHistory.value = Array.isArray(response.data) ? response.data : []; })
            .catch(error => { errors.value.push(error); });
    }

    function getEquipmentById(id) {
        const idNum = parseInt(id);
        return equipment.value.find(e => e.id === idNum || e.id === id);
    }

    /**
     * @param {Object} payload
     * @returns {Promise<Equipment|null>}
     */
    function addEquipment(payload) {
        const draft = new Equipment(payload);
        draft.status = draft.deriveStatus();
        return equipmentApi.createEquipment(draft)
            .then(response => {
                const created = EquipmentAssembler.toEntityFromResource(response.data);
                equipment.value.push(created);
                return created;
            })
            .catch(error => { errors.value.push(error); return null; });
    }

    /**
     * @param {Object} payload
     * @returns {Promise<Equipment|null>}
     */
    function updateEquipment(payload) {
        const entity = new Equipment(payload);
        entity.status = entity.deriveStatus();
        return equipmentApi.updateEquipment(entity)
            .then(response => {
                const updated = EquipmentAssembler.toEntityFromResource(response.data);
                const index = equipment.value.findIndex(e => e.id === updated.id);
                if (index !== -1) equipment.value[index] = updated;
                return updated;
            })
            .catch(error => { errors.value.push(error); return null; });
    }

    function deleteEquipment(item) {
        return equipmentApi.deleteEquipment(item.id)
            .then(() => {
                const index = equipment.value.findIndex(e => e.id === item.id);
                if (index !== -1) equipment.value.splice(index, 1);
            })
            .catch(error => { errors.value.push(error); });
    }

    /**
     * Applies a refill to an equipment item: raises the fuel level, recomputes
     * status, stamps the date and records a refill-history entry. Called by the
     * coordination service after a refill request has been created.
     *
     * @param {number} equipmentId
     * @param {number} quantity
     * @param {{ providerId:number, fuelType:string, requestId:number|null }} meta
     * @returns {Promise<Equipment|null>}
     */
    function applyRefill(equipmentId, quantity, meta = {}) {
        const item = getEquipmentById(equipmentId);
        if (!item) return Promise.resolve(null);
        const newLevel = Math.min(item.capacity, item.currentLevel + Number(quantity));
        const updated = new Equipment({ ...item, currentLevel: newLevel, lastRefillDate: new Date().toISOString() });
        updated.status = updated.deriveStatus();

        const historyEntry = {
            equipmentId,
            companyId: item.companyId,
            providerId: meta.providerId ?? item.favoriteProviderId,
            fuelType: item.requiredFuelType,
            quantity: Number(quantity),
            requestId: meta.requestId ?? null,
            createdAt: new Date().toISOString(),
        };
        equipmentApi.createRefillHistory(historyEntry)
            .then(res => { refillHistory.value.push(res.data ?? historyEntry); })
            .catch(() => { refillHistory.value.push(historyEntry); });

        return updateEquipment(updated);
    }

    /**
     * Applies a delivered order to an equipment item when the buyer confirms
     * reception: raises the fuel level by the delivered quantity (capped at
     * capacity, unit-converted) and assigns the favorite provider automatically
     * if the equipment did not have one yet.
     *
     * @param {number} equipmentId
     * @param {number} quantity - Delivered quantity in `unit`.
     * @param {string} unit - LITERS | GALLONS.
     * @param {number|null} providerId - Provider that fulfilled the order.
     * @param {{ requestId?:number|null }} [meta]
     * @returns {Promise<Equipment|null>}
     */
    function applyDelivery(equipmentId, quantity, unit, providerId, meta = {}) {
        const item = getEquipmentById(equipmentId);
        if (!item) return Promise.resolve(null);

        // Convert the delivered quantity into the equipment's own unit.
        const deliveredInUnit = unit === item.unit
            ? Number(quantity)
            : fromLiters(toLiters(quantity, unit), item.unit);
        const newLevel = Math.min(item.capacity, item.currentLevel + deliveredInUnit);

        // Assign the favorite provider on the first fulfilled order if none yet.
        const favoriteProviderId = item.favoriteProviderId ?? providerId ?? null;

        const updated = new Equipment({
            ...item,
            currentLevel: newLevel,
            favoriteProviderId,
            lastRefillDate: new Date().toISOString(),
        });
        updated.status = updated.deriveStatus();

        const historyEntry = {
            equipmentId,
            companyId: item.companyId,
            providerId: providerId ?? item.favoriteProviderId,
            fuelType: item.requiredFuelType,
            quantity: Math.round(deliveredInUnit),
            requestId: meta.requestId ?? null,
            createdAt: new Date().toISOString(),
        };
        equipmentApi.createRefillHistory(historyEntry)
            .then(res => { refillHistory.value.push(res.data ?? historyEntry); })
            .catch(() => { refillHistory.value.push(historyEntry); });

        return updateEquipment(updated);
    }

    function clearErrors() { errors.value = []; }

    return {
        equipment,
        favoriteProviders,
        refillHistory,
        loaded,
        loading,
        errors,
        forCompany,
        needingRefill,
        fetchEquipment,
        fetchFavoriteProviders,
        fetchRefillHistory,
        getEquipmentById,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        applyRefill,
        applyDelivery,
        clearErrors,
    };
});

export default useEquipmentStore;
