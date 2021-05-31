import {CONTACT_REPOSITORY} from 'core/constants'
import {Contact} from './contact.entity'

export const contactsProviders = [
    {
        provide: CONTACT_REPOSITORY,
        useValue: Contact,
    },
]
