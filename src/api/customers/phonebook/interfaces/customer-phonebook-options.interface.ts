import {CustomerPhonebookView} from '~/api/customers/phonebook/dto/customer-phonebook-query.dto'
import {FilterBy} from '~/interfaces/filter-by.interface'

type CustomerPhonebookFilterBy = FilterBy

export interface CustomerPhonebookOptions {
   view?: CustomerPhonebookView
   filterBy: CustomerPhonebookFilterBy
}