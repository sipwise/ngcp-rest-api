import {config} from '../../config/main'

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

export const JOURNAL_SERVICE = 'JOURNAL_SERVICE'
export const JOURNAL_REPOSITORY = 'JOURNAL_REPOSITORY'
export const JOURNAL_V2_REPOSITORY = 'JOURNAL_V2_REPOSITORY'
export const JOURNAL_OBJECT_REPOSITORY = 'JOURNAL_OBJECT_REPOSITORY'

export const LOGGING_SERVICE = 'LOGGING_SERVICE'

export const jwtConstants = {
    secret: config.common.jwt_key,
}