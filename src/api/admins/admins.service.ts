import {AdminBaseDto} from './dto/admin-base.dto'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {AppService} from '../../app.service'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {applyPatch, normalisePatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ForbiddenException, Injectable, Logger} from '@nestjs/common'
import {db} from '../../entities'
import {genSalt, hash} from 'bcrypt'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AclRole, Admin} from '../../entities/db/billing'
import {RBAC_ROLES} from '../../config/constants.config'
import {AuthResponseDto} from '../../auth/dto/auth-response.dto'
import {configureQueryBuilder} from '../../helpers/query-builder.helper'
import { AdminSearchDto } from './dto/admin-search.dto';

const SPECIAL_USER_LOGIN = 'sipwise'
const PERMISSION_DENIED = 'permission denied'

@Injectable()
export class AdminsService { // implements CrudService<AdminCreateDto, AdminResponseDto> {
    private readonly log = new Logger(AdminsService.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    async toResponse(dbAdmin: db.billing.Admin): Promise<AdminResponseDto> {
        this.log.debug({message: 'converting admin to response', func: this.toResponse.name})
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
            show_passwords: dbAdmin.show_passwords,
        }
    }

    @HandleDbErrors
    async create(admin: AdminCreateDto, req: ServiceRequest): Promise<AdminResponseDto> {
        this.log.debug({message: 'create admin', func: this.create.name, user: req.user.username})
        if (!await this.hasPermission(req.user, admin)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                role: req.user.role,
                requested_role: admin.role,
                is_master: req.user.is_master,
            })
            throw new ForbiddenException(PERMISSION_DENIED)
        }
        this.log.debug({
            message: 'check user permission level',
            success: true,
            role: req.user.role,
            is_master: req.user.is_master,
        })
        const aclRole = await db.billing.AclRole.findOne({where: {role: admin.role}})
        const {role, ...adminWithoutRole} = admin
        let dbAdmin = db.billing.Admin.create(adminWithoutRole)
        dbAdmin = await db.billing.Admin.merge(dbAdmin, await this.getPermissionFlags(role))
        dbAdmin.role_id = aclRole.id
        dbAdmin.role = aclRole

        if (req.user.reseller_id_required || admin.reseller_id == undefined) {
            dbAdmin.reseller_id = req.user.reseller_id
        }

        dbAdmin.saltedpass = await this.generateSaltedpass(admin.password)

        await db.billing.Admin.insert(dbAdmin)
        this.log.debug({
            message: 'create admin',
            success: true,
            id: dbAdmin.id,
        })
        return this.toResponse(dbAdmin)
    }

    @HandleDbErrors
    async readAll(page: number, rows: number, req: ServiceRequest): Promise<AdminResponseDto[]> {
        this.log.debug({
            message: 'read all admins',
            func: this.readAll.name,
            user: req.user.username,
            page: page,
            rows: rows,
        })
        let queryBuilder = db.billing.Admin.createQueryBuilder("admin")
        let adminSearchDtoKeys = Object.keys(new AdminSearchDto())
        await configureQueryBuilder(queryBuilder, req.query, {joins: [{alias: 'role', property: 'role'}], where: adminSearchDtoKeys, rows: +rows, page: +page})
        if (req.user.is_master) {
            let hasAccessTo = await req.user.role_data.has_access_to
            let roleIds = hasAccessTo.map(role => role.id)
            queryBuilder.andWhere('admin.role_id IN (:...roleIds)', {roleIds: roleIds})
            if (req.user.reseller_id_required) {
                queryBuilder.andWhere('admin.reseller_id = :reseller_id', {reseller_id: req.user.reseller_id})
            }
        } else {
            queryBuilder.andWhere("admin.id = :id", {id: req.user.id})
        }
        const result = await queryBuilder.getMany()
        return await Promise.all(result.map(async (adm) => this.toResponse(adm)))
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<AdminResponseDto> {
        this.log.debug({message: 'read admin by id', func: this.read.name, user: req.user.username, id: id})

        // if user is not master, only allow to query self
        if (!req.user.is_master) {
            this.log.debug({message: 'reading admin', is_master: req.user.is_master, id: id, user_id: req.user.id})
            if (id != req.user.id) {
                throw new ForbiddenException(PERMISSION_DENIED)
            }
            return this.toResponse(await db.billing.Admin.findOneOrFail(id, {relations: ['role']}))
        }
        let entry = await db.billing.Admin.findOneOrFail(id, {relations: ['role']})
        if (!await this.hasPermission(req.user, entry)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                user_score: await this.getPermissionScore(req.user),
                requested_score: await this.getPermissionScore(entry),
            })
            throw new ForbiddenException(PERMISSION_DENIED)
        }
        // check that reseller role can only request admins of same reseller_id
        if (req.user.reseller_id_required && entry.reseller_id != req.user.reseller_id) {
            throw new ForbiddenException(PERMISSION_DENIED)
        }
        return this.toResponse(entry)
    }

    async changePasswordAndEmail(admin: db.billing.Admin, password: string, email: string): Promise<db.billing.Admin> {
        if (email !== undefined) {
            admin = await db.billing.Admin.merge(admin, {email: admin.email})
        }
        if (password !== undefined) {
            admin = await db.billing.Admin.merge(
                admin,
                {saltedpass: await this.generateSaltedpass(admin['password'])},
            )
        }
        return admin
    }

    @HandleDbErrors
    async update(id: number, admin: AdminUpdateDto, req: ServiceRequest): Promise<AdminResponseDto> {
        this.log.debug({message: 'update admin by id', func: this.update.name, user: req.user.username, id: id})
        const userId = req.user.id
        let oldAdmin = await db.billing.Admin.findOneOrFail(id, {relations: ['role']})

        if (!req.user.is_master) {
            if (id != req.user.id)
                throw new ForbiddenException(PERMISSION_DENIED)

            let newAdmin = await this.changePasswordAndEmail(oldAdmin, admin['password'], admin['email'])
            if (oldAdmin == newAdmin) {
                throw new ForbiddenException(PERMISSION_DENIED) // TODO: check what error type to throw here
            }
            await db.billing.Admin.update(oldAdmin.id, oldAdmin)
            return this.toResponse(newAdmin)
        }
        const newRole = await db.billing.AclRole.findOne({where: {role: admin.role}})
        const {role, ...adminWithoutRole} = admin
        let newAdmin = db.billing.Admin.merge(oldAdmin, adminWithoutRole, await this.getPermissionFlags(role))
        newAdmin.role_id = newRole.id

        if (!await this.hasPermission(req.user, newAdmin)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                user_score: await this.getPermissionScore(req.user),
                requested_score: await this.getPermissionScore(newAdmin),
            })
            throw new ForbiddenException(PERMISSION_DENIED)
        }
        this.log.debug({
            message: 'check user permission level',
            success: true,
        })

        // generate saltedpass if new password was provided
        if (admin['password'] !== undefined) {
            newAdmin.saltedpass = await this.generateSaltedpass(admin.password)
        }
        newAdmin = this.validateUpdate(oldAdmin, newAdmin, userId)
        await db.billing.Admin.update(oldAdmin.id, newAdmin)
        return this.toResponse(oldAdmin)
    }

    @HandleDbErrors
    async adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<AdminResponseDto> {
        this.log.debug({
            message: 'patching admin',
            func: this.adjust.name,
            user: req.user.username,
            id: id,
            patch: patch,
        })
        const userId = req.user.id
        let admin: AdminBaseDto
        let oldAdmin = await db.billing.Admin.findOneOrFail(id, {relations: ['role']})

        if (!req.user.is_master) {
            if (id != req.user.id)
                throw new ForbiddenException(PERMISSION_DENIED)

            let email: string
            let password: string

            // iterate patch operations and find extract password and email replacements
            for (let p of normalisePatch(patch)) {
                if (p.op == 'replace' && p.path == '/password') {
                    password = p.value
                } else if (p.op == 'replace' && p.path == '/email') {
                    email = p.value
                }
            }

            let newAdmin = await this.changePasswordAndEmail(oldAdmin, password, email)
            if (oldAdmin == newAdmin) {
                throw new ForbiddenException(PERMISSION_DENIED) // TODO: check what error type to throw here
            }
            await db.billing.Admin.update(oldAdmin.id, oldAdmin)
            return this.toResponse(newAdmin)
        }

        admin = this.deflate(oldAdmin)

        // set password to current salted pass and compare if changed after patch
        // if it was changed, generated new saltedpass from password
        admin.password = oldAdmin.saltedpass
        admin = applyPatch(admin, patch).newDocument

        let newAdmin = await this.inflate(admin)
        newAdmin = db.billing.Admin.merge(newAdmin, await this.getPermissionFlags(newAdmin.role.role))
        if (!await this.hasPermission(req.user, newAdmin)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                user_score: await this.getPermissionScore(req.user),
                requested_score: await this.getPermissionScore(newAdmin),
            })
            throw new ForbiddenException(PERMISSION_DENIED)
        }
        this.log.debug({
            message: 'check user permission level',
            success: true,
        })
        if (admin.password != oldAdmin.saltedpass) {
            newAdmin.saltedpass = await this.generateSaltedpass(admin.password)
        }

        newAdmin = this.validateUpdate(oldAdmin, newAdmin, userId)
        await db.billing.Admin.update(oldAdmin.id, newAdmin)
        return this.toResponse(oldAdmin)
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest) {
        this.log.debug({message: 'delete admin by id', func: this.delete.name, user: req.user.username, id: id})
        if (req.user.id == id) {
            throw new ForbiddenException('cannot delete self')
        }

        let entry = await db.billing.Admin.findOneOrFail(id)
        if (!await this.hasPermission(req.user, entry)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                user_score: await this.getPermissionScore(req.user),
                requested_score: await this.getPermissionScore(entry),
            })
            throw new ForbiddenException(PERMISSION_DENIED)
        }
        this.log.debug({
            message: 'check user permission level',
            success: true,
        })
        if (entry.login == SPECIAL_USER_LOGIN) {
            throw new ForbiddenException('cannot delete special user ' + SPECIAL_USER_LOGIN)
        }

        await db.billing.Admin.remove(entry)
        return 1
    }

    @HandleDbErrors
    async searchOne(pattern: {}): Promise<AdminResponseDto> {
        return this.toResponse(
            await db.billing.Admin.findOneOrFail(pattern),
        )
    }

    /**
     * Prevents change of passwords of other admin users and prevents change of
     * protected fields when updating self (admin.id == user.id)
     * @param oldAdmin
     * @param newAdmin
     * @param userId
     * @private
     *
     * @returns admin object used to update the current entry
     */
    private validateUpdate(oldAdmin: Admin, newAdmin: Admin, userId: number): Admin {
        // if (oldAdmin.saltedpass != newAdmin.saltedpass && newAdmin.id != userId) {
        //     throw new ForbiddenException('password can only be changed for self')
        // }
        this.log.debug({message: 'validating update', user_id: userId, updated_user_id: newAdmin.id})
        // remove fields that are not changeable by self
        if (newAdmin.id == userId) {
            ['is_master', 'is_active', 'read_only', 'role', 'role_id'].map(s => {
                if (newAdmin[s] !== undefined) {
                    this.log.debug({message: 'cannot change field for self', id: userId, field: s})
                    delete newAdmin[s]
                }
            })
        }
        return newAdmin
    }

    private async inflate(dto: AdminBaseDto): Promise<db.billing.Admin> {
        const aclRole = await db.billing.AclRole.findOne({where: {role: dto.role}})
        const {role, ...adminWithoutRole} = dto
        let admin = db.billing.Admin.create(adminWithoutRole)
        admin.role_id = aclRole.id
        admin.role = aclRole
        return admin
    }

    private deflate(entry: db.billing.Admin): AdminBaseDto {
        return {
            id: entry.id,
            billing_data: entry.billing_data,
            call_data: entry.call_data,
            can_reset_password: entry.can_reset_password,
            email: entry.email,
            is_active: entry.is_active,
            is_master: entry.is_master,
            login: entry.login,
            password: entry.saltedpass,
            read_only: entry.read_only,
            reseller_id: entry.reseller_id,
            role: entry.role.role,
            show_passwords: entry.show_passwords,
        }
    }

    /**
     * Generates salted hash from plain text password.
     * @param password Plain text password
     * @private
     * @returns saltedpass
     */
    private async generateSaltedpass(password: string): Promise<string> {
        const bcrypt_version = 'b'
        const bcrypt_cost = 13
        const re = new RegExp(`^\\$2${bcrypt_version}\\$${bcrypt_cost}\\$(.*)$`)

        const salt = await genSalt(bcrypt_cost, bcrypt_version)
        const hashPwd = (await hash(password, salt)).match(re)[1]
        const b64salt = hashPwd.slice(0, 22)
        const b64hash = hashPwd.slice(22)
        return b64salt + '$' + b64hash
    }

    private async getPermissionFlags(role: string): Promise<any> {
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

    /**
     * Determines the RBAC role for the provided Admin
     * @param admin Admin to determine RBAC role for
     * @private
     * @returns RBAC_ROLES item
     */
    private async getRBACRole(admin: db.billing.Admin): Promise<string> {
        if (admin.is_system) {
            return RBAC_ROLES.system
        }
        if (admin.is_superuser) {
            if (admin.is_ccare) {
                return RBAC_ROLES.ccareadmin
            }
            return RBAC_ROLES.admin
        }
        if (admin.is_ccare) {
            return RBAC_ROLES.ccare
        }
        return RBAC_ROLES.reseller
    }

    /**
     * Determine a permission score depending on the admin role.
     * The more permissions the role had the higher the returned score
     *
     * Lawful intercept has the same score as system so it has a higher score than admin role.
     * @param admin
     * @private
     * @returns permissionScore
     */
    private async getPermissionScore(admin: any): Promise<number> {
        let role
        if (admin.role !== undefined) {
            role = admin.role
        } else {
            role = await this.getRBACRole(admin)
        }
        switch (role) {
            case RBAC_ROLES.ccare:
                return 1
            case RBAC_ROLES.ccareadmin:
                return 2
            case RBAC_ROLES.reseller:
                return 3
            case RBAC_ROLES.admin:
                return 4
            case RBAC_ROLES.lintercept:
                return 5 // value 5 so that admins cannot interact with lintercept
            case RBAC_ROLES.system:
                return 5
        }
        return 0
    }

    /**
     * Compares permission score of curUser with permission score of newPermissions.
     * Always returns false if the curUser does not have the is_master flag set.
     *
     * The permissions are compared by subtraction; if the newly requested permission score
     * is higher than the current user score false is returned. If the permission score of the current user is
     * larger or equal than the newly requested score return true.
     * @param curUser current user
     * @param newPermissions admin object with new permissions
     * @private
     */
    private async hasPermission(curUser: AuthResponseDto, newPermissions): Promise<boolean> {
        if (!curUser.is_master) {
            return false
        }
        const hasAccessToIds = (await curUser.role_data.has_access_to).map(role => role.id)

        let accessedRole: AclRole
        if (newPermissions.role_id === undefined) {
            accessedRole = await db.billing.AclRole.findOne({where: {role: newPermissions.role}})
        } else {
            accessedRole = await db.billing.AclRole.findOne(newPermissions.role_id)
        }
        // let scoreDifference = await this.getPermissionScore(curUser) - await this.getPermissionScore(newPermissions)
        // returns true if scoreDifference >= 0; else false
        this.log.debug({ids: hasAccessToIds, requested: accessedRole.id})
        return hasAccessToIds.includes(accessedRole.id)
    }
}
