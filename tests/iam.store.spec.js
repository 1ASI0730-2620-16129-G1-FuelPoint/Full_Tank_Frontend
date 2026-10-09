import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import useIamStore from '../src/iam/application/iam.store.js';
import { IamApi } from '../src/iam/infrastructure/iam-api.js';

vi.mock('../src/iam/infrastructure/iam-api.js', () => {
  const MockIamApi = vi.fn();
  MockIamApi.prototype.signIn = vi.fn();
  MockIamApi.prototype.signUp = vi.fn();
  MockIamApi.prototype.getUserById = vi.fn();
  MockIamApi.prototype.updateUserProfile = vi.fn();
  MockIamApi.prototype.changePassword = vi.fn();
  MockIamApi.prototype.getBuyerCompanies = vi.fn().mockResolvedValue({ data: [] });
  MockIamApi.prototype.getProviderCompanies = vi.fn().mockResolvedValue({ data: [] });
  MockIamApi.prototype.getBuyerCompanyById = vi.fn();
  MockIamApi.prototype.getProviderCompanyById = vi.fn();
  MockIamApi.prototype.createBuyerCompany = vi.fn();
  MockIamApi.prototype.createProviderCompany = vi.fn();
  MockIamApi.prototype.updateBuyerCompany = vi.fn();
  MockIamApi.prototype.updateProviderCompany = vi.fn();
  return { IamApi: MockIamApi };
});

describe('IAM Store Registration Contract & registrationToken Forwarding', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('captures registrationToken from buyer company creation and forwards it to signUp', async () => {
    const store = useIamStore();

    const companyResponse = {
      id: 10,
      name: 'Alpha Logistics',
      ruc: '20100000001',
      registrationToken: 'reg-token-buyer-12345',
    };
    IamApi.prototype.createBuyerCompany.mockResolvedValue({ data: companyResponse });
    IamApi.prototype.signUp.mockResolvedValue({ data: { id: 100 } });
    IamApi.prototype.signIn.mockResolvedValue({
      data: {
        id: 100,
        companyId: 10,
        name: 'Alpha Logistics',
        email: 'alpha@example.com',
        role: 'BUYER',
        token: 'fake-jwt-token',
      },
    });
    IamApi.prototype.getBuyerCompanyById.mockResolvedValue({ data: companyResponse });

    const payload = {
      role: 'BUYER',
      companyName: 'Alpha Logistics',
      ruc: '20100000001',
      sector: 'LOGISTICS',
      address: 'Av. Industrial 123',
      phone: '999888777',
      email: 'alpha@example.com',
      password: 'SecurePassword123!',
    };

    const session = await store.register(payload);

    // 1. Company creation was invoked
    expect(IamApi.prototype.createBuyerCompany).toHaveBeenCalledWith({
      name: 'Alpha Logistics',
      ruc: '20100000001',
      sector: 'LOGISTICS',
      address: 'Av. Industrial 123',
      contactEmail: 'alpha@example.com',
      phone: '999888777',
    });

    // 2. signUp receives user credentials AND registrationToken
    expect(IamApi.prototype.signUp).toHaveBeenCalledWith({
      name: 'Alpha Logistics',
      email: 'alpha@example.com',
      password: 'SecurePassword123!',
      role: 'BUYER',
      companyId: 10,
      username: 'alpha@example.com',
      registrationToken: 'reg-token-buyer-12345',
    });

    // 3. User is signed in and session is authenticated
    expect(IamApi.prototype.signIn).toHaveBeenCalledWith('alpha@example.com', 'SecurePassword123!');
    expect(session.isAuthenticated).toBe(true);
    expect(session.userId).toBe(100);
    expect(session.companyId).toBe(10);
    expect(store.currentCompany).toEqual(companyResponse);
  });

  it('captures registrationToken from provider company creation and forwards it to signUp', async () => {
    const store = useIamStore();

    const companyResponse = {
      id: 25,
      name: 'Petro Supply S.A.',
      ruc: '20200000002',
      registrationToken: 'reg-token-provider-67890',
    };
    IamApi.prototype.createProviderCompany.mockResolvedValue({ data: companyResponse });
    IamApi.prototype.signUp.mockResolvedValue({ data: { id: 200 } });
    IamApi.prototype.signIn.mockResolvedValue({
      data: {
        id: 200,
        companyId: 25,
        name: 'Petro Supply S.A.',
        email: 'provider@example.com',
        role: 'PROVIDER',
        token: 'fake-jwt-provider-token',
      },
    });
    IamApi.prototype.getProviderCompanyById.mockResolvedValue({ data: companyResponse });

    const payload = {
      role: 'PROVIDER',
      companyName: 'Petro Supply S.A.',
      ruc: '20200000002',
      address: 'Carretera Central Km 10',
      phone: '911222333',
      email: 'provider@example.com',
      password: 'ProviderPass456!',
      description: 'Industrial fuel distributor',
    };

    const session = await store.register(payload);

    expect(IamApi.prototype.createProviderCompany).toHaveBeenCalledWith({
      name: 'Petro Supply S.A.',
      ruc: '20200000002',
      address: 'Carretera Central Km 10',
      phone: '911222333',
      rating: 0,
      fuelTypesOffered: [],
      description: 'Industrial fuel distributor',
    });

    expect(IamApi.prototype.signUp).toHaveBeenCalledWith({
      name: 'Petro Supply S.A.',
      email: 'provider@example.com',
      password: 'ProviderPass456!',
      role: 'PROVIDER',
      companyId: 25,
      username: 'provider@example.com',
      registrationToken: 'reg-token-provider-67890',
    });

    expect(session.isAuthenticated).toBe(true);
    expect(session.role).toBe('PROVIDER');
  });

  it('throws iam.email-exists on 409 conflict during registration', async () => {
    const store = useIamStore();

    const conflictError = new Error('Conflict');
    conflictError.response = { status: 409 };
    IamApi.prototype.createBuyerCompany.mockRejectedValue(conflictError);

    await expect(store.register({
      role: 'BUYER',
      companyName: 'Duplicate Corp',
      ruc: '20100000001',
      sector: 'MINING',
      address: 'Street 1',
      phone: '123',
      email: 'exists@example.com',
      password: 'pass',
    })).rejects.toThrow('iam.email-exists');

    expect(store.error).toBe('iam.email-exists');
  });

  it('throws iam.user-failed on server error during registration', async () => {
    const store = useIamStore();

    IamApi.prototype.createBuyerCompany.mockRejectedValue(new Error('Internal Server Error'));

    await expect(store.register({
      role: 'BUYER',
      companyName: 'Alpha',
      ruc: '20100000001',
      sector: 'TRANSPORT',
      address: 'Street 2',
      phone: '456',
      email: 'error@example.com',
      password: 'pass',
    })).rejects.toThrow('iam.user-failed');

    expect(store.error).toBe('iam.user-failed');
  });
});
