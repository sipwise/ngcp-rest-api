import {FilterBy} from '~/interfaces/filter-by.interface'

interface BanAdminFilterBy extends FilterBy {
   userId: number
}
export interface BanAdminOptions {
   filterBy: BanAdminFilterBy
   isMaster: boolean
   hasAccessTo: number[]
}