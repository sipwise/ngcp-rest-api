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
    subscriberadmin = 'subscriberadmin',
}

export interface RbacFlag {
    is_system: boolean
    is_superuser: boolean
    is_ccare: boolean
    lawful_intercept: boolean
}

export const reservedQueryParams = [
    'page', // page number
    'rows', // row number
    'expand', // expand logic
    'allow_unknown_params', // when provided, unknown params are ignored
    'x_rbw_req_id', // reserved for ALE as their unique request identifier to appear in the logs
]
