import {SubscriberPhonebookView} from '~/api/subscribers/phonebook/dto/subscriber-phonebook-query.dto'
import {FilterBy} from '~/interfaces/filter-by.interface'

interface SubscriberPhonebookFilterBy extends FilterBy {
   subscriber_id?: number
}

export interface SubscriberPhonebookOptions {
   view?: SubscriberPhonebookView
   filterBy: SubscriberPhonebookFilterBy
}