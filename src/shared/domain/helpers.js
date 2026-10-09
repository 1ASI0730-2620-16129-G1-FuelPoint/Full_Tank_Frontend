/**
 * Small cross-cutting helpers shared by presentation and application layers.
 * Centralized to avoid duplicating unit conversion, money formatting and the
 * (simulated) map embed URL across bounded contexts.
 *
 * @module helpers
 */

export const LITERS_PER_GALLON = 3.78541;

/**
 * Converts a quantity to liters for unit-agnostic comparisons (stock, capacity).
 * @param {number} quantity
 * @param {string} unit - LITERS | GALLONS
 * @returns {number}
 */
export function toLiters(quantity, unit) {
    return unit === 'GALLONS' ? Number(quantity || 0) * LITERS_PER_GALLON : Number(quantity || 0);
}

/**
 * Converts a quantity expressed in liters into the target unit.
 * @param {number} liters
 * @param {string} unit - LITERS | GALLONS
 * @returns {number}
 */
export function fromLiters(liters, unit) {
    return unit === 'GALLONS' ? Number(liters || 0) / LITERS_PER_GALLON : Number(liters || 0);
}

/**
 * Formats a value as Peruvian Soles.
 * @param {number} value
 * @param {number} [minimumFractionDigits=2]
 * @returns {string}
 */
export function money(value, minimumFractionDigits = 2) {
    return `S/ ${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits: 2 })}`;
}

/**
 * Builds a keyless Google Maps embed URL for a delivery address.
 * Pure iframe pattern — no API key, SDK or JS API required (simulated map).
 * @param {string} address
 * @returns {string}
 */
export function mapEmbedUrl(address) {
    const query = encodeURIComponent(address || 'Lima, Peru');
    return `https://www.google.com/maps?q=${query}&output=embed`;
}

/**
 * Short unit suffix for display.
 * @param {string} unit
 * @returns {string}
 */
export function unitSuffix(unit) {
    return unit === 'LITERS' ? 'L' : 'gal';
}

/**
 * Formats a date for display without timezone drift.
 *
 * Date-only strings ("YYYY-MM-DD", e.g. a delivery date) are parsed as LOCAL
 * midnight — `new Date("2026-06-04")` would otherwise be parsed as UTC midnight
 * and render as the previous day in negative-offset timezones (e.g. UTC-5).
 * Full timestamps keep their time component by default.
 *
 * @param {string|Date} value
 * @param {string} [locale='en-US']
 * @param {boolean|null} [withTime=null] - Force time on/off; null = auto (off for date-only).
 * @returns {string}
 */
export function formatDate(value, locale = 'en-US', withTime = null) {
    if (!value) return '';
    const isDateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    let date;
    if (isDateOnly) {
        const [y, m, d] = value.split('-').map(Number);
        date = new Date(y, m - 1, d);
    } else {
        date = new Date(value);
    }
    const showTime = withTime === null ? !isDateOnly : withTime;
    const opts = { year: 'numeric', month: 'short', day: 'numeric' };
    if (showTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
    const tag = (locale === 'es' || locale === 'es-419') ? 'es-419' : 'en-US';
    return date.toLocaleString(tag, opts);
}
