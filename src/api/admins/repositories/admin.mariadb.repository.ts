import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ForbiddenException, Inject, Injectable} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {RbacFlag, RbacRole} from '../../../config/constants.config'
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
        const dbAdmin = await new db.billing.Admin().fromInternal(admin)

        await db.billing.Admin.insert(dbAdmin)
        this.log.debug({
            message: 'create admin',
            success: true,
            id: dbAdmin.id,
        })

        return await dbAdmin.toInternal()
    }

    @HandleDbErrors
    async readAll(sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        const query = db.billing.Admin.createQueryBuilder('admin')
        await configureQueryBuilder(query, sr.query, new SearchLogic(sr, Object.keys(new AdminSearchDto()), [{
            alias: 'role',
            property: 'role',
        }]))
        await this.applyAdminFilter(sr, query)
        const [result, totalCount] = await query.getManyAndCount()
        return [await Promise.all(result.map(async (adm) => adm.toInternal())), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, sr: ServiceRequest): Promise<internal.Admin> {
        const query = await this.applyAdminFilter(sr)
        query.andWhere('admin.id = :id', {id: id})
        const admin = await query.getOneOrFail()
        return admin.toInternal()
    }

    @HandleDbErrors
    async update(id: number, admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin> {
        const query = await this.applyAdminFilter(sr)
        await query.andWhere('admin.id = :id', {id: id}).getOneOrFail()

        const update = new db.billing.Admin().fromInternal(admin)
        Object.keys(update).map(key => {
            if (update[key] == undefined)
                delete update[key]
        })
        await db.billing.Admin.update(id, update)

        const updated: db.billing.Admin = await query.andWhere('admin.id = :id', {id: id}).getOneOrFail()
        return updated.toInternal()
    }

    @HandleDbErrors
    async delete(id: number, sr: ServiceRequest): Promise<number> {
        const query = await this.applyAdminFilter(sr)
        const dbAdmin = await query.andWhere('admin.id = :id', {id: id})
            .getOneOrFail()
        // TODO: move this check to service, but we do not have access to the dbAdmin.login field there
        if (dbAdmin.login == SPECIAL_USER_LOGIN) {
            throw new ForbiddenException(this.i18n.t('errors.ADMIN_DELETE_SPECIAL_USER', {args: {username: SPECIAL_USER_LOGIN}}))
        }

        await db.billing.Admin.remove(dbAdmin)
        return 1
    }

    @HandleDbErrors
    private async applySearchQuery(sr: ServiceRequest, query: SelectQueryBuilder<db.billing.Admin>): Promise<void> {
        await configureQueryBuilder(query, sr.params, new SearchLogic(sr, Object.keys(new AdminSearchDto()), [{
            alias: 'role',
            property: 'role',
        }]))
    }

    @HandleDbErrors
    private async applyAdminFilter(sr: ServiceRequest, query?: SelectQueryBuilder<db.billing.Admin>): Promise<SelectQueryBuilder<db.billing.Admin>> {
        query ||= db.billing.Admin.createQueryBuilder('admin')
            .leftJoinAndSelect('admin.role', 'role')
        if (sr.user.is_master) {
            const hasAccessTo = sr.user.role_data.has_access_to
            const roleIds = hasAccessTo.map(role => role.id)
            query.andWhere('admin.role_id IN (:...roleIds)', {roleIds: roleIds})
            if (sr.user.reseller_id_required) {
                query.andWhere('admin.reseller_id = :reseller_id', {reseller_id: sr.user.reseller_id})
            }
        } else {
            query.andWhere('admin.id = :req_user_id', {req_user_id: sr.user.id})
        }
        return query
    }
}
