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

export enum RbacRole {
    system = 'system',
    admin = 'admin',
    reseller = 'reseller',
    ccare = 'ccare',
    ccareadmin = 'ccareadmin',
    lintercept = 'lintercept',
    subscriber = 'subscriber',
}

export interface RbacFlag {
    is_system: boolean
    is_superuser: boolean
    is_ccare: boolean
    lawful_intercept: boolean
}