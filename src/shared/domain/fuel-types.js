/**
 * Shared fuel-type catalog used across bounded contexts (Catalog, Inventory,
 * Equipment, Ordering, Payment). Centralizing it keeps the vocabulary
 * consistent without coupling contexts to each other.
 *
 * @module fuel-types
 */

/** @type {{ code: string, label: string }[]} */
export const FUEL_TYPES = [
    { code: 'GASOLINE_84', label: 'Gasohol 84' },
    { code: 'GASOLINE_90', label: 'Gasohol 90' },
    { code: 'GASOLINE_95', label: 'Gasohol 95' },
    { code: 'GASOLINE_97', label: 'Gasohol 97' },
    { code: 'DIESEL_B5', label: 'Diesel B5' },
    { code: 'GLP', label: 'LPG (GLP)' },
    { code: 'GNV', label: 'CNG (GNV)' },
    { code: 'INDUSTRIAL_GAS', label: 'Industrial Gas' },
];

/**
 * Resolves a human-readable label for a fuel-type code.
 * @param {string} code - Fuel-type code (e.g. DIESEL_B5).
 * @returns {string} Friendly label, or the original code when unknown.
 */
export function fuelTypeLabel(code) {
    return FUEL_TYPES.find(f => f.code === code)?.label ?? code;
}

/** @type {{ code: string, label: string }[]} */
export const MEASUREMENT_UNITS = [
    { code: 'LITERS', label: 'Liters' },
    { code: 'GALLONS', label: 'Gallons' },
];
