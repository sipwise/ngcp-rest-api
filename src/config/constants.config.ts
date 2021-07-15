import {config} from '../config/main.config'

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

export const DEVELOPMENT = 'development'
export const TEST = 'test'
export const PRODUCTION = 'production'
export const ADMIN_REPOSITORY = 'ADMIN_REPOSITORY'
export const CONTACT_REPOSITORY = 'CONTACT_REPOSITORY'
export const DOMAIN_REPOSITORY = 'DOMAIN_REPOSITORY'

export const JOURNAL_SERVICE = 'JOURNAL_SERVICE'
export const JOURNAL_REPOSITORY = 'JOURNAL_REPOSITORY'
export const JOURNAL_V2_REPOSITORY = 'JOURNAL_V2_REPOSITORY'
export const JOURNAL_OBJECT_REPOSITORY = 'JOURNAL_OBJECT_REPOSITORY'

export const LOGGER_SERVICE = 'LOGGER_SERVICE'

export const jwtConstants = {
    secret: config.common.jwt_key,
}

export const RBAC_ROLES = {
    system: 'system',
    admin: 'admin',
    reseller: 'reseller',
    ccare: 'ccare',
    ccareadmin: 'ccareadmin'
}
