/**
 * Authenticated company session for the simulated IAM layer.
 *
 * A `/users` record is the company itself: its id is also the business id used
 * by equipment, orders, inventory, fulfillment, payments and notifications.
 */
export class Session {
    constructor({
        userId = null,
        companyId = null,
        name = '',
        email = '',
        role = null,
        token = '',
    } = {}) {
        this.userId = userId;
        this.companyId = companyId;
        this.name = name;
        this.email = email;
        this.role = role;
        this.token = token;
    }

    get displayName() {
        return this.name || this.email || 'User';
    }

    get isAuthenticated() {
        return Boolean(this.token) && (this.role === 'BUYER' || this.role === 'PROVIDER');
    }

    get isBuyer() {
        return this.role === 'BUYER';
    }

    get isProvider() {
        return this.role === 'PROVIDER';
    }
}
