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
    'order', // order asc/desc
    'order_by', // order_by field
    'search_or', // search multiple fields as "or" instead of "and" true/false
    'expand', // expand logic
    'soft_expand', // expand logic
    'allow_unknown_params', // when provided, unknown params are ignored
    'x_rbw_req_id', // reserved for ALE as their unique request identifier to appear in the logs
    'x_rbw_correl_id', // reserved for ALE as their unique request identifier to appear in the logs
]
