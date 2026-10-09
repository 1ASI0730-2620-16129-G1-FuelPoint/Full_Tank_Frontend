import usersSeed from './users.seed.json';
import { findFakeCollection, registerFakeCollection, registerFakeHandler } from '../../../shared/infrastructure/fake/fake-database.js';

const safeUser = ({ password, ...user }) => user;
const safeCompany = ({ registrationToken, ...company }) => company;
const error = (status, message, code) => ({ status, data: { message, ...(code ? { code } : {}) } });
const normalizeEmail = email => String(email ?? '').trim().toLowerCase();
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Academic demo only: credentials and mutations remain in browser memory. */
export function registerIamDemo({ usersPath, authenticationPath, buyerCompaniesPath, providerCompaniesPath }) {
    const users = () => findFakeCollection(usersPath);
    const companies = role => findFakeCollection(role === 'PROVIDER' ? providerCompaniesPath : buyerCompaniesPath);
    if (!users()) registerFakeCollection(usersPath, usersSeed);
    for (const [role, path] of [['BUYER', buyerCompaniesPath], ['PROVIDER', providerCompaniesPath]]) {
        if (!findFakeCollection(path)) {
            registerFakeCollection(path, usersSeed.filter(user => user.role === role).map(user => ({
                id: user.companyId, name: user.name, ruc: user.ruc ?? '', sector: user.sector ?? '',
                address: user.address ?? '', phone: user.phone ?? '', contactEmail: user.email,
                description: user.description ?? '', rating: 0, fuelTypesOffered: [],
            })));
        }
        const itemPath = new RegExp('^' + escape(path) + '/(?<id>[^/]+)$');
        registerFakeHandler('get', path, () => ({ data: companies(role).map(safeCompany) }));
        registerFakeHandler('get', itemPath, ({ params }) => {
            const company = companies(role).find(item => String(item.id) === params.id);
            return company ? { data: safeCompany(company) } : error(404, 'Company not found');
        });
        registerFakeHandler('post', path, ({ body }) => {
            if (!body.name?.trim() || !body.ruc?.trim()) return error(400, 'Company name and RUC are required');
            if ([...companies('BUYER'), ...companies('PROVIDER')].some(item => item.ruc === body.ruc)) {
                return error(409, 'RUC already exists', 'iam.ruc-exists');
            }
            const id = Math.max(0, ...users().map(item => Number(item.id)),
                ...companies('BUYER').map(item => Number(item.id)), ...companies('PROVIDER').map(item => Number(item.id))) + 1;
            const company = { ...body, id, registrationToken: 'demo-registration-' + id };
            companies(role).push(company);
            return { status: 201, data: company };
        });
        registerFakeHandler('put', itemPath, ({ body, params }) => {
            const company = companies(role).find(item => String(item.id) === params.id);
            if (!company) return error(404, 'Company not found');
            if ([...companies('BUYER'), ...companies('PROVIDER')].some(item => item.id !== company.id && item.ruc === body.ruc)) {
                return error(409, 'RUC already exists', 'iam.ruc-exists');
            }
            const { id, registrationToken, ...changes } = body;
            Object.assign(company, changes);
            for (const user of users().filter(item => item.role === role && item.companyId === company.id)) {
                for (const field of ['name', 'ruc', 'sector', 'address', 'phone', 'description']) {
                    if (field in changes) user[field] = changes[field];
                }
            }
            return { data: safeCompany(company) };
        });
    }

    registerFakeHandler('post', authenticationPath + '/sign-in', ({ body }) => {
        const user = users().find(item => normalizeEmail(item.email) === normalizeEmail(body.email));
        if (!user || user.password !== body.password) return error(401, 'Invalid credentials');
        return { data: { ...safeUser(user), token: 'demo-token-' + user.id } };
    });
    registerFakeHandler('post', authenticationPath + '/sign-up', ({ body }) => {
        if (!['BUYER', 'PROVIDER'].includes(body.role) || !normalizeEmail(body.email).includes('@') || !body.password) {
            return error(400, 'Valid role, email and password are required');
        }
        if (users().some(item => normalizeEmail(item.email) === normalizeEmail(body.email))) {
            return error(409, 'Email already exists', 'iam.email-exists');
        }
        const company = companies(body.role).find(item => String(item.id) === String(body.companyId));
        if (!company?.registrationToken || company.registrationToken !== body.registrationToken) {
            return error(400, 'Invalid company registration token');
        }
        const user = { ...safeCompany(company), id: Math.max(0, ...users().map(item => Number(item.id))) + 1,
            companyId: company.id, email: normalizeEmail(body.email), password: body.password, role: body.role };
        users().push(user);
        delete company.registrationToken;
        return { status: 201, data: safeUser(user) };
    });
    const userPath = suffix => new RegExp('^' + escape(usersPath) + '/(?<id>[^/]+)' + suffix + '$');
    registerFakeHandler('get', usersPath, () => ({ data: users().map(safeUser) }));
    registerFakeHandler('get', userPath(''), ({ params }) => {
        const user = users().find(item => String(item.id) === params.id);
        return user ? { data: safeUser(user) } : error(404, 'User not found');
    });
    registerFakeHandler('put', userPath('/profile'), ({ body, params }) => {
        const user = users().find(item => String(item.id) === params.id);
        if (!user) return error(404, 'User not found');
        const email = normalizeEmail(body.email);
        if (!email.includes('@')) return error(400, 'A valid email is required');
        if (users().some(item => item.id !== user.id && normalizeEmail(item.email) === email)) {
            return error(409, 'Email already exists', 'iam.email-exists');
        }
        user.email = email;
        if (body.name) user.name = body.name;
        return { data: safeUser(user) };
    });
    registerFakeHandler('put', userPath('/password'), ({ body, params }) => {
        const user = users().find(item => String(item.id) === params.id);
        if (!user) return error(404, 'User not found');
        if (user.password !== body.currentPassword) return error(401, 'Invalid current password');
        if (!body.newPassword) return error(400, 'A new password is required');
        user.password = body.newPassword;
        return { data: { updated: true } };
    });
}
