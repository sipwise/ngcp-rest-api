import {ADMIN_REPOSITORY} from '../../config/constants.config'
import {Admin} from '../../entities/db/billing/admin.entity'

export const adminsProviders = [
    {
        provide: ADMIN_REPOSITORY,
        useValue: Admin,
    },
]
