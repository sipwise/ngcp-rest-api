import {Injectable} from '@nestjs/common'
import {SelectQueryBuilder} from 'typeorm'

import {BanAdminSearchDto} from '~/api/bans/admins/dto/ban-admin-search.dto'
import {BanAdminOptions} from '~/api/bans/admins/interfaces/ban-admin-options.interface'
import {BanAdminRepository} from '~/api/bans/admins/interfaces/ban-admin.repository'
import {db, internal} from '~/entities'
import {configureQueryBuilder} from '~/helpers/query-builder.helper'
import {SearchLogic} from '~/helpers/search-logic.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {MariaDbRepository} from '~/repositories/mariadb.repository'

export interface FilterBy {
    ids?: number[]
}

@Injectable()
export class BanAdminMariadbRepository extends MariaDbRepository implements BanAdminRepository {
    private readonly log = new LoggerService(BanAdminMariadbRepository.name)

    constructor(
    ) {
        super()
    }

    async readAll(options: BanAdminOptions, sr: ServiceRequest, filterBy?: FilterBy): Promise<[internal.BanAdmin[], number]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        qb.where('ban_increment_stage > 0')
        const searchDto = new BanAdminSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        this.addFilterBy(qb, filterBy)
        await this.addPermissionCheckToQueryBuilder(qb, options)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(result.map(async (adm) => adm.toBanAdminInternal())), totalCount]
    }

    async readById(id: number, options: BanAdminOptions, _sr: ServiceRequest): Promise<internal.BanAdmin> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        qb.where('ban_increment_stage > 0')
        this.addPermissionCheckToQueryBuilder(qb, options)
        const admin = await qb.andWhere({id: id}).getOneOrFail()
        return admin.toBanAdminInternal()
    }

    async readWhereInIds(ids: number[], options: BanAdminOptions, sr: ServiceRequest): Promise<internal.BanAdmin[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        const searchDto = new BanAdminSearchDto()
        configureQueryBuilder(
            qb,
            sr.query,
            new SearchLogic(
                sr,
                Object.keys(searchDto),
                undefined,
                searchDto._alias,
            ),
        )
        qb.whereInIds(ids)
        this.addPermissionCheckToQueryBuilder(qb, options)
        const result = await qb.getMany()
        return await Promise.all(result.map(async (d) => d.toBanAdminInternal()))
    }

    private addPermissionCheckToQueryBuilder(qb: SelectQueryBuilder<db.billing.Admin>, options: BanAdminOptions): void {
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

    private addFilterBy(qb: SelectQueryBuilder<db.billing.Admin>, filterBy: FilterBy): void {
        if (filterBy) {
            if (filterBy.ids && filterBy.ids.length > 0) {
                qb.andWhereInIds(filterBy.ids)
            }
        }
    }
}
