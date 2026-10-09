const collections = new Map();
const clone = value => structuredClone(value);

/** Each BC registers its own demo data; the shared base has no business seed. */
export function registerFakeCollection(path, seed = []) {
    const normalized = '/' + path.replace(/^\/+|\/+$/g, '');
    if (normalized === '/' || !Array.isArray(seed)) throw new Error('A collection path and array seed are required.');
    if (collections.has(normalized)) throw new Error(`Fake collection already registered: ${normalized}`);
    collections.set(normalized, { seed: clone(seed), items: clone(seed) });
}

export function findFakeCollection(path) {
    return collections.get(path)?.items;
}

/** Restore registered collections without retaining mutations from a demo session. */
export function resetFakeDatabase() {
    for (const entry of collections.values()) entry.items = clone(entry.seed);
}

/** Clear registrations, useful for isolated tests and independent demo bootstraps. */
export function clearFakeCollections() {
    collections.clear();
}
