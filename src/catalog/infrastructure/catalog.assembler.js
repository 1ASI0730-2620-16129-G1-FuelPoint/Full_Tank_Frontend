import { CatalogProduct } from "../domain/model/catalog-product.entity.js";
import { Provider } from "../domain/model/provider.entity.js";

/**
 * Maps Catalog resources (providers + products) into domain entities.
 *
 * @class CatalogAssembler
 */
export class CatalogAssembler {
    static toProvider(resource) {
        return new Provider({ ...resource });
    }

    /**
     * Projects provider inventory tanks into buyer-facing catalog products.
     * Availability is derived from stock and tank status.
     */
    static toProductsFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['inventory'] ?? [];
        return resources.map(tank => {
            // Buyers can only request what's free to promise: physical stock minus
            // what's already reserved by accepted (not-yet-dispatched) orders.
            const availableStock = Math.max(0, Number(tank.stock || 0) - Number(tank.reserved || 0));
            const status = String(tank.status || '').toUpperCase();
            return new CatalogProduct({
                id: tank.id,
                providerId: tank.providerId,
                fuelType: tank.type,
                name: tank.name,
                description: tank.description,
                pricePerLiter: tank.pricePerLiter,
                stock: availableStock,
                capacity: tank.capacity,
                unit: tank.unit,
                active: ['ACTIVE', 'AVAILABLE'].includes(status),
                available: ['ACTIVE', 'AVAILABLE'].includes(status) && availableStock > 0,
            });
        });
    }

    static toProvidersFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data.users ?? [];
        return resources.map(r => this.toProvider(r));
    }
}
