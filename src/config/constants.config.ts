import { AppService } from 'app.sevice'

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

export const RBAC_ROLES = {
    system: 'system',
    admin: 'admin',
    reseller: 'reseller',
    ccare: 'ccare',
    ccareadmin: 'ccareadmin'
}
