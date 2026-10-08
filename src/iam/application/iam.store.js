import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { IamApi } from "../infrastructure/iam-api.js";
import { Session } from "../domain/model/session.entity.js";

const iamApi = new IamApi();
const STORAGE_KEY = 'fulltank.session';

function loadSession() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return new Session();
        return new Session(JSON.parse(raw));
    } catch {
        return new Session();
    }
}

function sessionFromUser(user) {
    return new Session({
        userId: user.id,
        companyId: user.companyId,
        name: user.name,
        email: user.email,
        role: user.role,
        token: user.token,
    });
}

const useIamStore = defineStore('iam', () => {
    const session = ref(loadSession());
    const buyerCompanies = ref([]);
    const providerCompanies = ref([]);
    const currentCompany = ref(null);
    const loading = ref(false);
    const error = ref(null);

    const role = computed(() => session.value.role);
    const isAuthenticated = computed(() => session.value.isAuthenticated);
    const isBuyer = computed(() => session.value.role === 'BUYER');
    const isProvider = computed(() => session.value.role === 'PROVIDER');
    const currentCompanyId = computed(() => isBuyer.value ? session.value.companyId : null);
    const currentProviderId = computed(() => isProvider.value ? session.value.companyId : null);
    const displayName = computed(() => session.value.displayName);
    const companyName = computed(() => session.value.name);
    const name = computed(() => session.value.name);
    const currentUserId = computed(() => session.value.userId);
    const email = computed(() => session.value.email);

    function persist() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session.value));
    }

    function fail(key) {
        error.value = key;
        throw new Error(key);
    }

    async function resolveCompanyForUser(user = session.value) {
        const companyId = user?.companyId;
        if (!companyId) return null;
        const response = user.role === 'PROVIDER'
            ? await iamApi.getProviderCompanyById(companyId)
            : await iamApi.getBuyerCompanyById(companyId);
        return response.data;
    }

    async function fetchDirectories() {
        loading.value = true;
        try {
            const [buyersRes, providersRes] = await Promise.all([
                iamApi.getBuyerCompanies(),
                iamApi.getProviderCompanies(),
            ]);
            buyerCompanies.value = Array.isArray(buyersRes.data) ? buyersRes.data : [];
            providerCompanies.value = Array.isArray(providersRes.data) ? providersRes.data : [];
            const directory = isProvider.value ? providerCompanies.value : buyerCompanies.value;
            currentCompany.value = directory.find(
                company => String(company.id) === String(session.value.companyId),
            ) ?? currentCompany.value;
        } catch (err) {
            console.error('IAM directories error:', err);
        } finally {
            loading.value = false;
        }
    }

    async function login(emailInput, password) {
        loading.value = true;
        error.value = null;
        try {
            let authenticatedUser;
            try {
                const response = await iamApi.signIn(emailInput, password);
                authenticatedUser = response.data;
            } catch {
                fail('iam.invalid-credentials');
            }

            session.value = sessionFromUser(authenticatedUser);
            persist();
            try {
                currentCompany.value = await resolveCompanyForUser(authenticatedUser);
            } catch {
                logout();
                fail('iam.user-failed');
            }
            return session.value;
        } finally {
            loading.value = false;
        }
    }

    async function register(payload) {
        loading.value = true;
        error.value = null;
        try {
            try {
                const companyResponse = payload.role === 'PROVIDER'
                    ? await iamApi.createProviderCompany({
                        name: payload.companyName,
                        ruc: payload.ruc,
                        address: payload.address,
                        phone: payload.phone,
                        rating: 0,
                        fuelTypesOffered: [],
                        description: payload.description ?? '',
                    })
                    : await iamApi.createBuyerCompany({
                        name: payload.companyName,
                        ruc: payload.ruc,
                        sector: payload.sector,
                        address: payload.address,
                        contactEmail: payload.email,
                        phone: payload.phone,
                    });

                currentCompany.value = companyResponse.data;
                const registrationToken = companyResponse.data?.registrationToken ?? '';

                await iamApi.signUp({
                    name: payload.companyName,
                    email: payload.email,
                    password: payload.password,
                    role: payload.role,
                    companyId: currentCompany.value.id,
                    username: payload.email,
                    registrationToken,
                });
            } catch (registrationError) {
                if (registrationError?.response?.status === 409) {
                    fail('iam.email-exists');
                }
                fail('iam.user-failed');
            }

            return await login(payload.email, payload.password);
        } finally {
            loading.value = false;
        }
    }

    async function updateProfile({ email: emailInput }) {
        loading.value = true;
        error.value = null;
        try {
            const id = session.value.userId;
            const { data: user } = await iamApi.getUserById(id);
            const { data: updated } = await iamApi.updateUserProfile(id, {
                name: user.name,
                email: emailInput,
            });
            session.value = new Session({
                ...session.value,
                name: updated.name,
                email: updated.email,
            });
            persist();
            return updated;
        } catch (updateError) {
            if (updateError?.response?.status === 409) fail('iam.email-exists');
            throw updateError;
        } finally {
            loading.value = false;
        }
    }

    async function updateCompanyProfile(payload) {
        loading.value = true;
        error.value = null;
        try {
            const companyId = session.value.companyId;
            const existing = currentCompany.value ?? await resolveCompanyForUser();
            const companyPayload = isProvider.value ? {
                name: payload.companyName,
                ruc: payload.ruc,
                address: payload.address,
                phone: payload.phone,
                rating: existing?.rating ?? 0,
                fuelTypesOffered: existing?.fuelTypesOffered ?? [],
                description: payload.description ?? '',
            } : {
                name: payload.companyName,
                ruc: payload.ruc,
                sector: payload.sector,
                address: payload.address,
                contactEmail: session.value.email,
                phone: payload.phone,
            };
            const { data: updated } = isProvider.value
                ? await iamApi.updateProviderCompany(companyId, companyPayload)
                : await iamApi.updateBuyerCompany(companyId, companyPayload);

            currentCompany.value = updated;
            const directory = isProvider.value ? providerCompanies : buyerCompanies;
            const index = directory.value.findIndex(
                company => String(company.id) === String(companyId),
            );
            if (index >= 0) directory.value[index] = updated;
            return updated;
        } catch (updateError) {
            if (updateError?.response?.status === 409) fail('iam.ruc-exists');
            throw updateError;
        } finally {
            loading.value = false;
        }
    }

    async function changePassword({ currentPassword, newPassword, confirmNewPassword }) {
        loading.value = true;
        error.value = null;
        try {
            if (newPassword !== confirmNewPassword) fail('iam.password-mismatch');
            const id = session.value.userId;
            await iamApi.changePassword(id, {
                currentPassword,
                newPassword,
            });
        } catch (passwordChangeError) {
            if (passwordChangeError?.response?.status === 401) {
                fail('iam.invalid-current-password');
            }
            throw passwordChangeError;
        } finally {
            loading.value = false;
        }
    }

    async function fetchCurrentUser() {
        if (!session.value.userId) return null;
        try {
            const { data: user } = await iamApi.getUserById(session.value.userId);
            session.value = new Session({
                ...session.value,
                name: user.name,
                email: user.email,
                role: user.role,
                companyId: user.companyId,
            });
            persist();
            currentCompany.value = await resolveCompanyForUser();
            return user;
        } catch {
            logout();
            return null;
        }
    }

    function selectBuyer(company) {
        currentCompany.value = company ?? null;
        session.value = new Session();
    }

    function selectProvider(provider) {
        currentCompany.value = provider ?? null;
        session.value = new Session();
    }

    function logout() {
        session.value = new Session();
        currentCompany.value = null;
        error.value = null;
        localStorage.removeItem(STORAGE_KEY);
    }

    return {
        session,
        buyerCompanies,
        providerCompanies,
        currentCompany,
        loading,
        error,
        role,
        isAuthenticated,
        isBuyer,
        isProvider,
        currentCompanyId,
        currentProviderId,
        displayName,
        companyName,
        name,
        currentUserId,
        email,
        fetchDirectories,
        resolveCompanyForUser,
        login,
        register,
        updateProfile,
        updateCompanyProfile,
        changePassword,
        fetchCurrentUser,
        selectBuyer,
        selectProvider,
        logout,
    };
});

export default useIamStore;
