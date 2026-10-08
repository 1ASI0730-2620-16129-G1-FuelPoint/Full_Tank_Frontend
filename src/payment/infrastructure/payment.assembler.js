import { Payment } from "../domain/model/payment.entity.js";
import { Invoice } from "../domain/model/invoice.entity.js";

/**
 * Maps Payment resources into domain entities.
 * @class PaymentAssembler
 */
export class PaymentAssembler {
    static toEntityFromResource(resource) {
        return new Payment({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['payments'] ?? [];
        return resources.map(r => this.toEntityFromResource(r));
    }
}

/**
 * Maps Invoice resources into domain entities.
 * @class InvoiceAssembler
 */
export class InvoiceAssembler {
    static toEntityFromResource(resource) {
        return new Invoice({ ...resource });
    }

    static toEntitiesFromResponse(response) {
        if (response.status !== 200) {
            console.error(`${response.status} - ${response.statusText}`);
            return [];
        }
        const resources = response.data instanceof Array ? response.data : response.data['invoices'] ?? [];
        return resources.map(r => this.toEntityFromResource(r));
    }
}
