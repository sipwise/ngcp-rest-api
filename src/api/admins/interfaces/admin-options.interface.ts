import {FilterBy} from '~/interfaces/filter-by.interface'

interface AdminFilterBy extends FilterBy {
   userId: number
}
export interface AdminOptions {
   filterBy: AdminFilterBy
   isMaster: boolean
   hasAccessTo: number[]
}