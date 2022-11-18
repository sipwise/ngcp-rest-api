import {RbacRole} from '../../../config/constants.config'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {NotFoundException} from '@nestjs/common'
import {internal} from '../../../entities'
import {AdminRepository} from '../interfaces/admin.repository'

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
            }),
            2: internal.Admin.create({id: 2, login: 'administrator', role: RbacRole.admin}),
            3: internal.Admin.create({
                id: 3,
                login: 'reseller_master',
                saltedpass: 'verysalty',
                role: RbacRole.reseller,
                is_master: true,
            }),
            4: internal.Admin.create({id: 4, login: 'reseller', role: RbacRole.reseller}),
            5: internal.Admin.create({
                id: 5,
                login: 'ccareadmin_master',
                role: RbacRole.ccareadmin,
                is_master: true,
            }),
            6: internal.Admin.create({id: 6, login: 'ccareadmin', role: RbacRole.ccareadmin}),
        }
    }

    create(entity: internal.Admin): Promise<internal.Admin> {
        const nextId = this.getNextId()
        entity.id = nextId
        this.db[nextId] = entity

        return Promise.resolve(entity)
    }

    delete(id: number, sr: ServiceRequest): Promise<number> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(1)
    }

    readById(id: number, sr: ServiceRequest): Promise<internal.Admin> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    readAll(sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        const admins: [internal.Admin[], number] =
            [Object.keys(this.db).map(id => this.db[id]), Object.keys(this.db).length]
        return Promise.resolve(admins)
    }

    update(id: number, admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin> {
        this.throwErrorIfIdNotExists(id)
        this.db[id] = admin
        return Promise.resolve(admin)
    }

    private getNextId(): number {
        const keys = Object.keys(this.db)
        return (+keys[keys.length - 1]) + 1
    }

    private throwErrorIfIdNotExists(id: number) {
        if (this.db[id] == undefined)
            throw new NotFoundException()
    }
}
