import {FilterBy} from '~/interfaces/filter-by.interface'

interface PbxUserFilterBy extends FilterBy {
   id?: number
}

export interface PbxUserOptions {
   filterBy: PbxUserFilterBy
}