import {AppService} from '../app.service'

export const DATABASES = {
    accounting: {
        token: 'db_accounting',
        name: 'accounting',
    },
    billing: {
        token: 'db_billing',
        name: 'billing',
    },
}

export const LOGGER_SERVICE = 'LOGGER_SERVICE'

export const jwtConstants = {
    secret: AppService.config.common.jwt_key,
}

// TODO: Rename to singular RBAC_ROLE
// export const RBAC_ROLES = {
//     system: 'system',
//     admin: 'admin',
//     reseller: 'reseller',
//     ccare: 'ccare',
//     ccareadmin: 'ccareadmin',
// }
export enum RBAC_ROLES {
    system = 'system',
    admin = 'admin',
    reseller = 'reseller',
    ccare = 'ccare',
    ccareadmin = 'ccareadmin',
    lintercept = 'lintercept'
}
