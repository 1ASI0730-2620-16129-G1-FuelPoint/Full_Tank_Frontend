import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useEquipmentStore from '../src/equipment/application/equipment.store.js';
import { EquipmentApi } from '../src/equipment/infrastructure/equipment-api.js';
import { Equipment } from '../src/equipment/domain/model/equipment.entity.js';

vi.mock('../src/equipment/infrastructure/equipment-api.js', () => {
    const MockEquipmentApi = vi.fn();
    MockEquipmentApi.prototype.getEquipment = vi.fn().mockResolvedValue({ data: [] });
    MockEquipmentApi.prototype.createEquipment = vi.fn();
    MockEquipmentApi.prototype.updateEquipment = vi.fn();
    MockEquipmentApi.prototype.deleteEquipment = vi.fn();
    MockEquipmentApi.prototype.getFavoriteProviders = vi.fn().mockResolvedValue({ data: [] });
    MockEquipmentApi.prototype.getRefillHistory = vi.fn().mockResolvedValue({ data: [] });
    MockEquipmentApi.prototype.createRefillHistory = vi.fn();
    return { EquipmentApi: MockEquipmentApi };
});

describe('Equipment Store Bounded Context Tests', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    it('initializes with empty equipment list and default state', () => {
        const store = useEquipmentStore();
        expect(store.equipment).toEqual([]);
        expect(store.loading).toBe(false);
        expect(store.errors).toEqual([]);
    });

    it('filters equipment belonging to a specific company', () => {
        const store = useEquipmentStore();
        store.equipment = [
            new Equipment({ id: 1, companyId: 10, name: 'Caterpillar 320D', capacity: 400 }),
            new Equipment({ id: 2, companyId: 20, name: 'Komatsu PC200', capacity: 350 }),
            new Equipment({ id: 3, companyId: 10, name: 'Generac 150kVA', capacity: 800 })
        ];

        const companyEquipment = store.forCompany(10);
        expect(companyEquipment.length).toBe(2);
        expect(companyEquipment.map(e => e.id)).toEqual([1, 3]);
    });

    it('identifies equipment needing refill based on refill threshold', () => {
        const store = useEquipmentStore();
        store.equipment = [
            new Equipment({ id: 1, companyId: 10, capacity: 1000, currentLevel: 150, refillThreshold: 20 }), // 15% <= 20% -> needs refill
            new Equipment({ id: 2, companyId: 10, capacity: 1000, currentLevel: 500, refillThreshold: 20 })  // 50% > 20% -> ok
        ];

        const needing = store.needingRefill(10);
        expect(needing.length).toBe(1);
        expect(needing[0].id).toBe(1);
    });

    it('adds new equipment and updates the local state', async () => {
        const store = useEquipmentStore();
        const payload = {
            id: 4,
            companyId: 10,
            name: 'Volvo FH16',
            type: 'Truck',
            requiredFuelType: 'DIESEL_B5',
            capacity: 600,
            currentLevel: 450
        };

        EquipmentApi.prototype.createEquipment.mockResolvedValue({ data: payload });

        const result = await store.addEquipment(payload);
        expect(result).not.toBeNull();
        expect(store.equipment.length).toBe(1);
        expect(store.equipment[0].name).toBe('Volvo FH16');
    });

    it('removes equipment from store upon successful deletion', async () => {
        const store = useEquipmentStore();
        const item = new Equipment({ id: 5, companyId: 10, name: 'Equipment to delete' });
        store.equipment = [item];

        EquipmentApi.prototype.deleteEquipment.mockResolvedValue({ status: 200 });

        await store.deleteEquipment(item);
        expect(store.equipment.length).toBe(0);
    });
});
