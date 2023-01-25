import {FilterBy} from '../../../interfaces/filter-by.interface'
import {ContactType} from '../../../entities/internal/contact.internal.entity'

export interface ContactOptions {
    filterBy?: FilterBy
    type?: ContactType
}
