import {RBAC_ROLES} from '../../config/constants.config'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {NotFoundException} from '@nestjs/common'
import {internal} from '../../entities'

interface AdminsMockDB {
    [key: number]: internal.Admin
}

export class AdminsMockRepository {
    private readonly db: AdminsMockDB

    constructor() {
        this.db = {
            1: internal.Admin.create({
                id: 1,
                login: 'administrator_master',
                role: RBAC_ROLES.admin,
                is_master: true,
                billing_data: false,
                is_superuser: true,
            }),
            2: internal.Admin.create({id: 2, login: 'administrator', role: RBAC_ROLES.admin}),
            3: internal.Admin.create({
                id: 3,
                login: 'reseller_master',
                saltedpass: 'verysalty',
                role: RBAC_ROLES.reseller,
                is_master: true,
            }),
            4: internal.Admin.create({id: 4, login: 'reseller', role: RBAC_ROLES.reseller}),
            5: internal.Admin.create({
                id: 5,
                login: 'ccareadmin_master',
                role: RBAC_ROLES.ccareadmin,
                is_master: true,
            }),
            6: internal.Admin.create({id: 6, login: 'ccareadmin', role: RBAC_ROLES.ccareadmin}),
        }
    }

    create(entity: internal.Admin): Promise<internal.Admin> {
        const nextId = this.getNextId()
        entity.id = nextId
        this.db[nextId] = entity

        return Promise.resolve(entity)
    }

    delete(id: number, req: ServiceRequest): Promise<number> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(1)
    }

    readById(id: number, req: ServiceRequest): Promise<internal.Admin> {
        this.throwErrorIfIdNotExists(id)
        return Promise.resolve(this.db[id])
    }

    readAll(page: number, rows: number, req: ServiceRequest): Promise<internal.Admin[]> {
        return Promise.resolve([])
    }

    update(id: number, admin: internal.Admin, req: ServiceRequest): Promise<internal.Admin> {
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