import { describe, expect, it } from 'vitest';
import { Session } from '../src/iam/domain/model/session.entity.js';

describe('IAM session domain', () => {
    it('starts without an authenticated account', () => {
        expect(new Session().isAuthenticated).toBe(false);
    });
    it.each(['BUYER', 'PROVIDER'])('accepts a token with the supported %s role', role => {
        const session = new Session({ token: 'demo-token', role, userId: 1, companyId: 1 });
        expect(session.isAuthenticated).toBe(true);
        expect(session.isProvider).toBe(role === 'PROVIDER');
        expect(session.isBuyer).toBe(role === 'BUYER');
    });
    it('rejects unsupported roles and sessions without a token', () => {
        expect(new Session({ role: 'ADMIN', token: 'demo-token' }).isAuthenticated).toBe(false);
        expect(new Session({ role: 'BUYER' }).isAuthenticated).toBe(false);
    });
});
