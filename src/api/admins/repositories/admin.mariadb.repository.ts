import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ForbiddenException, Inject, Injectable} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {AdminSearchDto} from '../dto/admin-search.dto'
import {SelectQueryBuilder} from 'typeorm'
import {AdminRepository} from '../interfaces/admin.repository'
import {SearchLogic} from '../../../helpers/search-logic.helper'
import {LoggerService} from '../../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'

const SPECIAL_USER_LOGIN = 'sipwise'

@Injectable()
export class AdminMariadbRepository implements AdminRepository {
    private readonly log = new LoggerService(AdminMariadbRepository.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
    ) {
    }

    @HandleDbErrors
    async create(admin: internal.Admin): Promise<internal.Admin> {
        const dbAdmin = new db.billing.Admin().fromInternal(admin)

        await db.billing.Admin.insert(dbAdmin)
        this.log.debug({
            message: 'create admin',
            success: true,
            id: dbAdmin.id,
        })

        return dbAdmin.toInternal()
    }

    @HandleDbErrors
    async createMany(admins: internal.Admin[]): Promise<number[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        const values = admins.map(admin => new db.billing.Admin().fromInternal(admin))
        const result = await qb.insert().values(values).execute()

        return result.identifiers.map(obj => obj.id)

    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        configureQueryBuilder(qb, sr.query, new SearchLogic(sr, Object.keys(new AdminSearchDto())))
        await this.addPermissionCheckToQueryBuilder(qb, sr)
        const [result, totalCount] = await qb.getManyAndCount()
        return [await Promise.all(result.map(async (adm) => adm.toInternal())), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest): Promise<internal.Admin> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, sr)
        qb.andWhere('admin.id = :id', {id: id})
        const admin = await qb.getOneOrFail()
        return admin.toInternal()
    }

    async readWhereInIds(ids: number[], sr: ServiceRequest): Promise<internal.Admin[]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, sr)
        const created = await qb.andWhereInIds(ids).getMany()
        return created.map(admin => admin.toInternal())
    }

    @HandleDbErrors
    async update(id: number, admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, sr)
        await qb.andWhere('admin.id = :id', {id: id}).getOneOrFail()

        const update = new db.billing.Admin().fromInternal(admin)
        Object.keys(update).map(key => {
            if (update[key] == undefined)
                delete update[key]
        })
        await db.billing.Admin.update(id, update)

        const updated: db.billing.Admin = await qb.andWhere('admin.id = :id', {id: id}).getOneOrFail()
        return updated.toInternal()
    }

    @HandleDbErrors
    async delete(id: number, sr: ServiceRequest): Promise<internal.Admin> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, sr)
        const dbAdmin = await qb.andWhere('admin.id = :id', {id: id})
            .getOneOrFail()
        // TODO: move this check to service, but we do not have access to the dbAdmin.login field there
        if (dbAdmin.login == SPECIAL_USER_LOGIN) {
            throw new ForbiddenException(this.i18n.t('errors.ADMIN_DELETE_SPECIAL_USER', {args: {username: SPECIAL_USER_LOGIN}}))
        }

        await db.billing.Admin.remove(dbAdmin)
        return dbAdmin.toInternal()
    }

    @HandleDbErrors
    async deleteMany(ids: number[], sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        const qb = db.billing.Admin.createQueryBuilder('admin')
        this.addPermissionCheckToQueryBuilder(qb, sr)
        qb.andWhereInIds(ids)
        const admins = await qb.getMany()  // get admins to delete

        qb.andWhere('admin.login = :login', {login: SPECIAL_USER_LOGIN})
        const count = await qb.getCount()
        if (count > 0) {
            throw new ForbiddenException(this.i18n.t('errors.ADMIN_DELETE_SPECIAL_USER', {args: {username: SPECIAL_USER_LOGIN}}))
        }

        const deleteQb = db.billing.Admin.createQueryBuilder('admin').delete()
        deleteQb.andWhereInIds(admins.map(admin => admin.id))

        const result = await deleteQb.execute()

        if (sr.returnContent)
            return [admins.map(adm => adm.toInternal()), result.affected]
    }

    @HandleDbErrors
    private async applySearchQuery(sr: ServiceRequest, query: SelectQueryBuilder<db.billing.Admin>): Promise<void> {
        await configureQueryBuilder(query, sr.params, new SearchLogic(sr, Object.keys(new AdminSearchDto())))
    }

    @HandleDbErrors
    private addPermissionCheckToQueryBuilder(qb: SelectQueryBuilder<db.billing.Admin>, sr: ServiceRequest): void {
        // TODO: pass FilterBy to repo
        qb.leftJoinAndSelect('admin.role', 'role')
        if (sr.user.is_master) {  // restrict query to roles the user is allowed to access
            const hasAccessTo = sr.user.role_data.has_access_to
            const roleIds = hasAccessTo.map(role => role.id)
            qb.andWhere('admin.role_id IN (:...roleIds)', {roleIds: roleIds})
            if (sr.user.reseller_id_required) {  // restrict query to reseller_id
                qb.andWhere('admin.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
            }
        } else {  // restrict user to self if user is not master
            qb.andWhere('admin.id = :req_user_id', {req_user_id: sr.user.id})
        }
    }
}
