import {HandleDbErrors} from '../../../decorators/handle-db-errors.decorator'
import {ForbiddenException, Injectable, Logger} from '@nestjs/common'
import {db, internal} from '../../../entities'
import {ServiceRequest} from '../../../interfaces/service-request.interface'
import {RbacFlag, RbacRole} from '../../../config/constants.config'
import {configureQueryBuilder} from '../../../helpers/query-builder.helper'
import {AdminSearchDto} from '../dto/admin-search.dto'
import {SelectQueryBuilder} from 'typeorm'
import {Messages} from '../../../config/messages.config'
import {AdminsRepository} from '../interfaces/admins.repository'
import {SearchLogic} from '../../../helpers/search-logic.helper'

const SPECIAL_USER_LOGIN = 'sipwise'

@Injectable()
export class AdminsMariadbRepository implements AdminsRepository {
    private readonly log = new Logger(AdminsMariadbRepository.name)

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
    async readAll(req: ServiceRequest): Promise<[internal.Admin[], number]> {
        const query = db.billing.Admin.createQueryBuilder('admin')
        await configureQueryBuilder(query, req.query, new SearchLogic(req, Object.keys(new AdminSearchDto()), [{
            alias: 'role',
            property: 'role',
        }]))
        await this.applyAdminFilter(req, query)
        const [result, totalCount] = await query.getManyAndCount()
        return [await Promise.all(result.map(async (adm) => adm.toInternal())), totalCount]
    }

    @HandleDbErrors
    async readById(id: number, req: ServiceRequest): Promise<internal.Admin> {
        const query = await this.applyAdminFilter(req)
        query.andWhere('admin.id = :id', {id: id})
        const admin = await query.getOneOrFail()
        return admin.toInternal()
    }

    @HandleDbErrors
    async update(id: number, admin: internal.Admin, req: ServiceRequest): Promise<internal.Admin> {
        const query = await this.applyAdminFilter(req)
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
    async delete(id: number, req: ServiceRequest): Promise<number> {
        const query = await this.applyAdminFilter(req)
        const dbAdmin = await query.andWhere('admin.id = :id', {id: id})
            .getOneOrFail()
        if (dbAdmin.login == SPECIAL_USER_LOGIN) {
            throw new ForbiddenException(Messages.invoke(Messages.DELETE_SPECIAL_USER, req).description + SPECIAL_USER_LOGIN)
        }

        await db.billing.Admin.remove(dbAdmin)
        return 1
    }

    async getRoleByPermissionFlags(flags: RbacFlag): Promise<RbacRole> {
        if (flags.lawful_intercept)
            return RbacRole.lintercept
        if (flags.is_system)
            return RbacRole.system
        if (flags.is_superuser)
            return flags.is_ccare ? RbacRole.ccareadmin : RbacRole.admin
        if (flags.is_ccare)
            return RbacRole.ccare
        return RbacRole.reseller
    }

    @HandleDbErrors
    private async applySearchQuery(sr: ServiceRequest, query: SelectQueryBuilder<db.billing.Admin>): Promise<void> {
        await configureQueryBuilder(query, sr.params, new SearchLogic(sr, Object.keys(new AdminSearchDto()), [{
            alias: 'role',
            property: 'role',
        }]))
    }

    @HandleDbErrors
    private async applyAdminFilter(req: ServiceRequest, query?: SelectQueryBuilder<db.billing.Admin>): Promise<SelectQueryBuilder<db.billing.Admin>> {
        query ||= db.billing.Admin.createQueryBuilder('admin')
            .leftJoinAndSelect('admin.role', 'role')
        if (req.user.is_master) {
            const hasAccessTo = req.user.role_data.has_access_to
            const roleIds = hasAccessTo.map(role => role.id)
            query.andWhere('admin.role_id IN (:...roleIds)', {roleIds: roleIds})
            if (req.user.reseller_id_required) {
                query.andWhere('admin.reseller_id = :reseller_id', {reseller_id: req.user.reseller_id})
            }
        } else {
            query.andWhere('admin.id = :req_user_id', {req_user_id: req.user.id})
        }
        return query
    }
}
