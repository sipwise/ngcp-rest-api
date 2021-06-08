import {CONTACT_REPOSITORY} from '../../config/constants.config'
import {Contact} from '../../entities/db/billing/contact.entity'

export const contactsProviders = [
    {
        provide: CONTACT_REPOSITORY,
        useValue: Contact,
    },
]
