import {AdminDto} from './dto/admin.dto'
import {AppService} from '../../app.service'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {ForbiddenException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {db} from '../../entities'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AclRole, AclRoleMapping, Admin} from '../../entities/db/billing'
import {RBAC_FLAGS, RBAC_ROLES} from '../../config/constants.config'
import {configureQueryBuilder} from '../../helpers/query-builder.helper'
import {AdminSearchDto} from './dto/admin-search.dto'
import {SelectQueryBuilder} from 'typeorm'
import {ExpandHelper} from '../../helpers/expand.helper'
import {ResellersController} from '../resellers/resellers.controller'
import {CustomercontactsController} from '../customercontacts/customercontacts.controller'
import {ContractsController} from '../contracts/contracts.controller'

const SPECIAL_USER_LOGIN = 'sipwise'

@Injectable()
export class AdminsRepository {
    private readonly log = new Logger(AdminsRepository.name)
    private readonly expandHelper = new ExpandHelper(this.resellersController, this.customercontactsController, this.contractsController)

    constructor(
        private readonly app: AppService,
        private readonly resellersController: ResellersController,
        private readonly customercontactsController: CustomercontactsController,
        private readonly contractsController: ContractsController,
    ) {
    }

    async toObject(dbAdmin: Admin): Promise<AdminDto> {
        return {
            billing_data: dbAdmin.billing_data,
            call_data: dbAdmin.call_data,
            can_reset_password: dbAdmin.can_reset_password,
            email: dbAdmin.email,
            id: dbAdmin.id,
            is_active: dbAdmin.is_active,
            is_ccare: dbAdmin.is_ccare,
            is_master: dbAdmin.is_master,
            is_superuser: dbAdmin.is_superuser,
            is_system: dbAdmin.is_system,
            lawful_intercept: dbAdmin.lawful_intercept,
            login: dbAdmin.login,
            read_only: dbAdmin.read_only,
            reseller_id: dbAdmin.reseller_id,
            role: dbAdmin.role.role,
            role_id: dbAdmin.role_id,
            show_passwords: dbAdmin.show_passwords,
        }
    }

    @HandleDbErrors
    async createAdmin(admin: AdminDto): Promise<AdminDto> {
        const aclRole = await db.billing.AclRole.findOne({where: {role: admin.role}})
        const {role, ...adminWithoutRole} = admin
        let dbAdmin = db.billing.Admin.create(adminWithoutRole)
        dbAdmin = db.billing.Admin.merge(dbAdmin, await this.getPermissionFlags(role))
        dbAdmin.role_id = aclRole.id
        dbAdmin.role = aclRole

        await db.billing.Admin.insert(dbAdmin)
        this.log.debug({
            message: 'create admin',
            success: true,
            id: dbAdmin.id,
        })

        admin.role = dbAdmin.role.role

        return admin
    }

    @HandleDbErrors
    async applySearchQuery(page: number, rows: number, params: any, query: SelectQueryBuilder<any>): Promise<void> {
        let adminSearchDtoKeys = Object.keys(new AdminSearchDto())
        await configureQueryBuilder(query, params, {
            joins: [{alias: 'role', property: 'role'}],
            where: adminSearchDtoKeys,
            rows: +rows,
            page: +page,
        })
    }

    @HandleDbErrors
    async applyAdminFilter(req: ServiceRequest, query?: SelectQueryBuilder<any>): Promise<SelectQueryBuilder<any>> {
        query ||= db.billing.Admin.createQueryBuilder('admin')
            .leftJoinAndSelect('admin.role', 'role')
        if (req.user.is_master) {
            let hasAccessTo = await req.user.role_data.has_access_to
            let roleIds = hasAccessTo.map(role => role.id)
            query.andWhere('admin.role_id IN (:...roleIds)', {roleIds: roleIds})
            if (req.user.reseller_id_required) {
                query.andWhere('admin.reseller_id = :reseller_id', {reseller_id: req.user.reseller_id})
            }
        } else {
            query.andWhere('admin.id = :req_user_id', {req_user_id: req.user.id})
        }
        return query
    }

    @HandleDbErrors
    async readAllAdmin(page: number, rows: number, req: ServiceRequest): Promise<AdminDto[]> {
        let query = db.billing.Admin.createQueryBuilder('admin')
        await this.applySearchQuery(page, rows, req.query, query)
        await this.applyAdminFilter(req, query)
        const result = await query.getMany()
        const responseList = await Promise.all(result.map(async (adm) => this.toObject(adm)))
        if (req.query.expand) {
            let adminSearchDtoKeys = Object.keys(new AdminSearchDto())
            await this.expandHelper.expandMultipleObjects(responseList, adminSearchDtoKeys, req)
        }
        return responseList
    }

    @HandleDbErrors
    async readAdmin(id: number, req: ServiceRequest): Promise<AdminDto> {
        let query = await this.applyAdminFilter(req)
        query.andWhere('admin.id = :id', {id: id})
        return this.toObject(await query.getOneOrFail())
    }

    @HandleDbErrors
    async updateAdmin(id: number, admin: AdminDto, req: ServiceRequest): Promise<AdminDto> {
        let query = await this.applyAdminFilter(req)
        let dbAdmin: Admin = await query.andWhere('admin.id = :id', {id: id})
            .getOneOrFail()
        Object.keys(admin).forEach(key => {
            if (key == 'password')
                return
            dbAdmin[key] = admin[key]
        })
        dbAdmin.role_id = await this.getRoleIdByRole(admin.role)
        dbAdmin.role = await db.billing.AclRole.findOne(dbAdmin.role_id)
        dbAdmin = db.billing.Admin.merge(dbAdmin, await this.getPermissionFlags(dbAdmin.role.role))

        await db.billing.Admin.update(id, dbAdmin)

        return this.toObject(dbAdmin)
    }

    @HandleDbErrors
    async deleteAdmin(id: number, req: ServiceRequest): Promise<number> {
        let query = await this.applyAdminFilter(req)
        let dbAdmin = await query.andWhere('admin.id = :id', {id: id})
            .getOneOrFail()
        if (dbAdmin.login == SPECIAL_USER_LOGIN) {
            throw new ForbiddenException('cannot delete special user ' + SPECIAL_USER_LOGIN)
        }

        await db.billing.Admin.remove(dbAdmin)
        return 1
    }

    async getPermissionFlags(role: string): Promise<RBAC_FLAGS> {
        switch (role) {
            case RBAC_ROLES.system:
                return {
                    is_system: true,
                    is_superuser: false,
                    is_ccare: false,
                    lawful_intercept: false,
                }
            case RBAC_ROLES.admin:
                return {
                    is_system: false,
                    is_superuser: true,
                    is_ccare: false,
                    lawful_intercept: false,
                }
            case RBAC_ROLES.reseller:
                return {
                    is_system: false,
                    is_superuser: false,
                    is_ccare: false,
                    lawful_intercept: false,
                }
            case RBAC_ROLES.ccareadmin:
                return {
                    is_system: false,
                    is_superuser: true,
                    is_ccare: true,
                    lawful_intercept: false,
                }
            case RBAC_ROLES.ccare:
                return {
                    is_system: false,
                    is_superuser: false,
                    is_ccare: true,
                    lawful_intercept: false,
                }
            case RBAC_ROLES.lintercept:
                return {
                    is_system: false,
                    is_superuser: false,
                    is_ccare: false,
                    lawful_intercept: true,
                }
        }
    }

    async getRoleByPermissionFlags(flags: RBAC_FLAGS): Promise<RBAC_ROLES> {
        if (flags.lawful_intercept)
            return RBAC_ROLES.lintercept
        if (flags.is_system)
            return RBAC_ROLES.system
        if (flags.is_superuser)
            return flags.is_ccare ? RBAC_ROLES.ccareadmin : RBAC_ROLES.admin
        if (flags.is_ccare)
            return RBAC_ROLES.ccare
        return RBAC_ROLES.reseller
    }

    async getRoleIdByRole(role: string): Promise<number> {
        const aclRole = await AclRole.findOne({
            where: {
                role: role,
            },
        })
        if (!aclRole)
            throw new UnprocessableEntityException(`Unknown role ${role}`)
        return aclRole.id
    }

    async hasPermission(roleId: number, accessToRoleId: number): Promise<boolean> {
        return await AclRoleMapping.findOne({
            where: {
                accessor_id: roleId,
                has_access_to_id: accessToRoleId,
            },
        }) ? true : false
    }

    async hasPermissionById(userId: number, accessToUserId: number): Promise<boolean> {
        let accessor = await Admin.findOneOrFail(userId)
        let hasAccessTo = await Admin.findOneOrFail(accessToUserId)
        return await AclRoleMapping.findOne({
            where: {
                accessor_id: accessor.role_id,
                has_access_to_id: hasAccessTo.role_id,
            },
        }) ? true : false
    }
}
