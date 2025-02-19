import {FilterBy} from '~/interfaces/filter-by.interface'

interface BanSubscriberFilterBy extends FilterBy {
   ids?: number[]
}
export interface BanSubscriberOptions {
   filterBy: BanSubscriberFilterBy
}