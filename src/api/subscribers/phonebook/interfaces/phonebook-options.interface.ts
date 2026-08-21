import {SubscriberPhonebookView} from '~/api/subscribers/phonebook/dto/phonebook-query.dto'
import {FilterBy} from '~/interfaces/filter-by.interface'

interface SubscriberPhonebookFilterBy extends FilterBy {
   subscriberId?: number
}

export interface SubscriberPhonebookOptions {
   view?: SubscriberPhonebookView
   filterBy: SubscriberPhonebookFilterBy
}