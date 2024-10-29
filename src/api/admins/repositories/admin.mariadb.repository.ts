import {Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {SelectQueryBuilder} from 'typeorm'

import {AdminSearchDto} from '~/api/admins/dto/admin-search.dto'
import {AdminOptions} from '~/api/admins/interfaces/admin-options.interface'
import {AdminRepository} from '~/api/admins/interfaces/admin.repository'
import {db, internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

@Injectable()
export class AdminMariadbRepository extends MariaDbRepository implements AdminRepository {
    private readonly log = new LoggerService(AdminMariadbRepository.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
        super()
    }

    async create(admins: internal.Admin[]): Promise<number[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        const values = admins.map(admin => new db.billing.Admin().fromInternal(admin))
        const result = await qb.insert().values(values).execute()
        return result.identifiers.map(obj => obj.id)
    }

    async readAll(options: AdminOptions, sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        const searchDto = new AdminSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(sr, Object.keys(searchDto), undefined, searchDto._alias),
        )
        await this.addPermissionCheckToQueryBuilder(qb, options)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(result.map(async (adm) => adm.toInternal())), totalCount]
    }

    async readById(id: number, options: AdminOptions): Promise<internal.Admin> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, options)
        const admin = await qb.andWhere({id: id}).getOneOrFail()
        return admin.toInternal()
    }

    async readWhereInIds(ids: number[], options: AdminOptions): Promise<internal.Admin[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, options)
        const admins = await qb.andWhereInIds(ids).getMany()
        return admins.map(admin => admin.toInternal())
    }

    async readCountOfIds(ids: number[], options: AdminOptions): Promise<number> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, options)
        return await qb.andWhereInIds(ids).getCount()
    }

    async update(updates: Dictionary<internal.Admin>, _options: AdminOptions): Promise<number[]> {
        const ids: number[] = []
        for (const key of Object.keys(updates)) {
            const id = parseInt(key)
            const admin = updates[id]

            const update = new db.billing.Admin().fromInternal(admin)
            Object.keys(update).map(key => {
                if (update[key] == undefined)
                    delete update[key]
            })
            await db.billing.Admin.update(id, update)
            ids.push(id)
        }
        return ids
    }

    async delete(ids: number[]): Promise<number[]> {
        await db.billing.Admin.delete(ids)
        return ids
    }

    private addPermissionCheckToQueryBuilder(qb: SelectQueryBuilder<db.billing.Admin>, options: AdminOptions): void {
        qb.leftJoinAndSelect('admin.role', 'role')
        if (options.isMaster) {  // restrict query to roles the user is allowed to access
            qb.andWhere('admin.role_id IN (:...roleIds)', {roleIds: options.hasAccessTo})
            if (options.filterBy.resellerId) {  // restrict query to reseller_id
                qb.andWhere('admin.reseller_id = :reseller_id', {reseller_id: options.filterBy.resellerId})
            }
        } else {  // restrict user to self if user is not master
            qb.andWhere('admin.id = :req_user_id', {req_user_id: options.filterBy.userId})
        }
    }
}
