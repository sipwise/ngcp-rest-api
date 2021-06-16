import {DOMAIN_REPOSITORY} from '../../config/constants.config'
import {Domain} from '../../entities/db/billing/domain.entity'

export const domainsProviders = [
    {
        provide: DOMAIN_REPOSITORY,
        useValue: Domain,
    },
]
