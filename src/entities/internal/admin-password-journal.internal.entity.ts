import {RbacRole} from '../../config/constants.config'
import {internal} from './../../entities'
import {genSalt, hash} from 'bcrypt'

export interface AdminPasswordJournalInterface {
    id?: number
    admin_id: number
    value: string
}

export class AdminPasswordJournal implements AdminPasswordJournalInterface {
    id: number
    admin_id: number
    value: string

    static create(data: AdminPasswordJournalInterface): AdminPasswordJournal {
        const journal = new AdminPasswordJournal()

        Object.keys(data).map(key => {
            journal[key] = data[key]
        })
        return journal
    }
}