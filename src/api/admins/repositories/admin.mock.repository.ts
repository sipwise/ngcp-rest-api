import {NotFoundException} from '@nestjs/common'

import {AdminOptions} from '~/api/admins/interfaces/admin-options.interface'
import {AdminRepository} from '~/api/admins/interfaces/admin.repository'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

interface AdminMockDB {
    [key: number]: internal.Admin
}

export class AdminMockRepository implements AdminRepository {
    private readonly db: AdminMockDB

    constructor() {
        this.db = {
            1: internal.Admin.create({
                id: 1,
                login: 'administrator_master',
                role: RbacRole.admin,
                is_master: true,
                billing_data: false,
                is_superuser: true,
                reseller_id: 1,
            }),
            2: internal.Admin.create({id: 2, login: 'administrator', role: RbacRole.admin}),
            3: internal.Admin.create({
                id: 3,
                login: 'reseller_master',
                saltedpass: 'verysalty',
                role: RbacRole.reseller,
                is_master: true,
                reseller_id: 1,
            }),
            4: internal.Admin.create({id: 4, login: 'reseller', role: RbacRole.reseller, reseller_id: 1}),
            5: internal.Admin.create({
                id: 5,
                login: 'ccareadmin_master',
                role: RbacRole.ccareadmin,
                is_master: true,
                reseller_id: 1,
            }),
            6: internal.Admin.create({id: 6, login: 'ccareadmin', role: RbacRole.ccareadmin}),
        }
    }

    create(admins: internal.Admin[]): Promise<number[]> {
        const nextId = this.getNextId()
        admins[0].id = nextId
        this.db[nextId] = admins[0]

        return Promise.resolve([nextId])
    }

    delete(ids: number[]): Promise<number[]> {
        for (const id of ids) {
            this.throwErrorIfIdNotExists(id)
        }
        return Promise.resolve(ids)
    }

    readById(id: number, _options: AdminOptions): Promise<internal.Admin> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    readWhereInIds(ids: number[], _options: AdminOptions): Promise<internal.Admin[]> {
        const admins: internal.Admin[] = []
        for (const i of ids) {
            this.throwErrorIfIdNotExists(i)
            admins.push(this.db[i])
        }
        return Promise.resolve(admins)
    }

    readAll(_options: AdminOptions, _sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        const admins: [internal.Admin[], number] =
            [Object.keys(this.db).map(id => this.db[id] as internal.Admin), Object.keys(this.db).length]
        return Promise.resolve(admins)
    }

    readCountOfIds(ids: number[], _options?: AdminOptions): Promise<number> {
        return Promise.resolve(ids.length)
    }

    update(updates: Dictionary<internal.Admin>, _options: AdminOptions): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        for (const id of ids) {
            this.throwErrorIfIdNotExists(id)
            this.db[id] = updates[id]
        }
        return Promise.resolve(ids)
    }

    private getNextId(): number {
        const keys = Object.keys(this.db)
        return (+keys[keys.length - 1]) + 1
    }

    private throwErrorIfIdNotExists(id: number): void {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }
}
