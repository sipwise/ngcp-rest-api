import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {Inject, Injectable} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {AdminSearchDto} from '../dto/admin-search.dto'
import {SelectQueryBuilder} from 'typeorm'
import {AdminRepository} from '../interfaces/admin.repository'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {LoggerService} from '../../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {AdminOptions} from '../interfaces/admin-options.interface'
import {Dictionary} from '../../../helpers/dictionary.helper'

@Injectable()
export class AdminMariadbRepository implements AdminRepository {
    private readonly log = new LoggerService(AdminMariadbRepository.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
    }

    @HandleDbErrors
    async create(admins: internal.Admin[]): Promise<number[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        const values = admins.map(admin => new db.billing.Admin().fromInternal(admin))
        const result = await qb.insert().values(values).execute()

        return result.identifiers.map(obj => obj.id)

    }

    @HandleDbErrors
    async readAll(options: AdminOptions, sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new AdminSearchDto())))
        await this.addPermissionCheckToQueryBuilder(qb, options)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(result.map(async (adm) => adm.toInternal())), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, options: AdminOptions): Promise<internal.Admin> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, options)
        const admin = await qb.andWhere({id: id}).getOneOrFail()
        return admin.toInternal()
    }

    @HandleDbErrors
    async readWhereInIds(ids: number[], options: AdminOptions): Promise<internal.Admin[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, options)
        const admins = await qb.andWhereInIds(ids).getMany()
        return admins.map(admin => admin.toInternal())
    }

    @HandleDbErrors
    async readCountOfIds(ids: number[], options: AdminOptions): Promise<number> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, options)
        return await qb.andWhereInIds(ids).getCount()
    }

    @HandleDbErrors
    async update(updates: Dictionary<internal.Admin>, options: AdminOptions): Promise<number[]> {
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

    @HandleDbErrors
    async delete(ids: number[]): Promise<number[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin').delete()
        qb.andWhereInIds(ids)
        await qb.execute()
        return ids
    }

    @HandleDbErrors
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
