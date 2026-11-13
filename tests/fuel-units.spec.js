import { describe, expect, it } from 'vitest';
import { normalizeFuelUnit, unitSuffix, toLiters, fromLiters, formatDate } from '../src/shared/domain/helpers.js';
import { CatalogAssembler } from '../src/catalog/infrastructure/catalog.assembler.js';
import { ProductAssembler } from '../src/inventory/infrastructure/product.assembler.js';
import { EquipmentAssembler } from '../src/equipment/infrastructure/equipment.assembler.js';
import { VehicleAssembler } from '../src/fulfillment/infrastructure/vehicle.assembler.js';
import { RequestAssembler } from '../src/ordering/infrastructure/request.assembler.js';
import { OrderAssembler } from '../src/ordering/infrastructure/order.assembler.js';
import { InvoiceAssembler } from '../src/payment/infrastructure/payment.assembler.js';

describe('units from the real API', () => {
    it.each(['L', 'LT', 'liter', 'LITERS'])('displays %s as liters', unit => {
        expect(normalizeFuelUnit(unit)).toBe('LITERS');
        expect(unitSuffix(unit)).toBe('L');
        expect(toLiters(10, unit)).toBe(10);
    });
    it.each(['GAL', 'GL', 'gallon', 'GALLONS'])('converts %s without confusing liters and gallons', unit => {
        expect(unitSuffix(unit)).toBe('gal');
        expect(toLiters(10, unit)).toBeCloseTo(37.8541);
        expect(fromLiters(37.8541, unit)).toBeCloseTo(10);
    });
    it('preserves cubic meters and unknown units instead of labeling them gallons', () => {
        expect(normalizeFuelUnit('M3')).toBe('M3');
        expect(unitSuffix('M3')).toBe('m³');
        expect(unitSuffix('KG')).toBe('KG');
    });
    it('maps real API resources to the unit codes used by forms and equipment comparisons', () => {
        const resource = { id: 1, unit: 'L', quantity: 20, capacity: 100, stock: 75, status: 'ACTIVE' };
        for (const assembler of [ProductAssembler, EquipmentAssembler, VehicleAssembler, RequestAssembler, OrderAssembler, InvoiceAssembler]) {
            const entity = assembler.toEntityFromResource(resource);
            expect(entity.unit).toBe('LITERS');
            expect(entity.id).toBe(1);
        }
        const [product] = CatalogAssembler.toProductsFromResponse({ status: 200, data: [resource] });
        expect(product.unit).toBe('LITERS');
        expect(product.stock).toBe(75);
    });
    it('formats date-only invoice strings without shifting backward across timezones', () => {
        expect(formatDate('2026-11-12', 'en-US', false, 'long')).toBe('November 12, 2026');
    });
});
