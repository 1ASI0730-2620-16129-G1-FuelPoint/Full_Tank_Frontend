/**
 * In-memory fake database for the FullTank demo build (`VITE_USE_FAKE_API=true`).
 *
 * Seeds itself from a deep clone of `server/db.json` so the demo ships with
 * realistic data, and keeps every mutation in memory for the session.
 * Company directories are derived from the shared `/users` collection,
 * mirroring the backend contract documented in `iam-api.js`.
 */
import seed from '../../../../server/db.json';

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

const db = {
    users: clone(seed.users ?? []),
    providerRatings: clone(seed.providerRatings ?? []),
    providerProducts: clone(seed.providerProducts ?? []),
    inventory: clone(seed.inventory ?? []),
    inventoryMovements: clone(seed.inventoryMovements ?? []),
    equipment: clone(seed.equipment ?? []),
    favoriteProviders: clone(seed.favoriteProviders ?? []),
    refillHistory: clone(seed.refillHistory ?? []),
    requests: clone(seed.requests ?? []),
    orders: clone(seed.orders ?? []),
    vehicles: clone(seed.vehicles ?? []),
    drivers: clone(seed.drivers ?? []),
    deliveries: clone(seed.deliveries ?? []),
    payments: clone(seed.payments ?? []),
    invoices: clone(seed.invoices ?? []),
    notifications: clone(seed.notifications ?? []),
};

/** endpoint path (without leading slash) -> collection key in `db`. */
export const collectionByPath = {
    'users': 'users',
    'inventory-items': 'inventory',
    'inventory-movements': 'inventoryMovements',
    'provider-products': 'providerProducts',
    'favorite-providers': 'favoriteProviders',
    'provider-ratings': 'providerRatings',
    'equipment': 'equipment',
    'refill-history': 'refillHistory',
    'vehicles': 'vehicles',
    'drivers': 'drivers',
    'deliveries': 'deliveries',
    'fuel-requests': 'requests',
    'orders': 'orders',
    'payments': 'payments',
    'invoices': 'invoices',
    'notifications': 'notifications',
};

export function collection(name) {
    return db[name];
}

export function nextId(name) {
    const items = db[name];
    const max = items.reduce((top, item) => {
        const value = Number(item?.id);
        return Number.isFinite(value) && value > top ? value : top;
    }, 0);
    return max + 1;
}

export function findById(name, id) {
    return db[name].find(item => String(item?.id) === String(id)) ?? null;
}

export function removeById(name, id) {
    const items = db[name];
    const index = items.findIndex(item => String(item?.id) === String(id));
    if (index === -1) return null;
    const [removed] = items.splice(index, 1);
    return removed;
}

/** Companies created at runtime (e.g. via registration) that have no user yet. */
const extraCompanies = {
    buyer: [],
    provider: [],
};

export function nextCompanyId() {
    const ids = [
        ...db.users.map(user => Number(user?.id)),
        ...extraCompanies.buyer.map(company => Number(company?.id)),
        ...extraCompanies.provider.map(company => Number(company?.id)),
    ].filter(value => Number.isFinite(value));
    return (ids.length ? Math.max(...ids) : 0) + 1;
}

export function addExtraCompany(kind, company) {
    extraCompanies[kind].push(company);
    return company;
}

export function findExtraCompany(kind, id) {
    return extraCompanies[kind].find(company => String(company?.id) === String(id)) ?? null;
}

/** Buyers directory: users with role BUYER plus runtime-created companies. */
export function buyerCompanies() {
    return [
        ...extraCompanies.buyer,
        ...db.users
            .filter(user => user?.role === 'BUYER')
            .map(user => ({
                id: user.id,
                name: user.name,
                ruc: user.ruc ?? '',
                sector: user.sector ?? '',
                address: user.address ?? '',
                contactEmail: user.email ?? '',
                phone: user.phone ?? '',
            })),
    ];
}

/** Providers directory: users with role PROVIDER plus runtime companies. */
export function providerCompanies() {
    return [
        ...extraCompanies.provider,
        ...db.users
            .filter(user => user?.role === 'PROVIDER')
            .map(user => {
            const ratings = db.providerRatings.filter(
                rating => String(rating?.providerId) === String(user.id),
            );
            const average = ratings.length
                ? ratings.reduce((sum, rating) => sum + Number(rating.rating ?? 0), 0) / ratings.length
                : 0;
            return {
                id: user.id,
                name: user.name,
                ruc: user.ruc ?? '',
                address: user.address ?? '',
                phone: user.phone ?? '',
                rating: Math.round(average * 10) / 10,
                ratingsCount: ratings.length,
                fuelTypesOffered: user.fuelTypesOffered ?? [],
                description: user.description ?? '',
            };
        }),
    ];
}

export function buyerName(id) {
    const found = buyerCompanies().find(company => String(company.id) === String(id));
    return found?.name ?? `#${id}`;
}

export function buyerSector(id) {
    const found = db.users.find(
        user => String(user?.id) === String(id) && user?.role === 'BUYER',
    );
    return found?.sector ?? '—';
}

export function providerName(id) {
    const found = providerCompanies().find(company => String(company.id) === String(id));
    return found?.name ?? `#${id}`;
}

export function nowIso() {
    return new Date().toISOString();
}
