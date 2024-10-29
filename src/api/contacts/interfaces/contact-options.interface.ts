import {ContactType} from '~/entities/internal/contact.internal.entity'
import {FilterBy} from '~/interfaces/filter-by.interface'

export interface ContactOptions {
    filterBy?: FilterBy
    type?: ContactType
}
