import {AdminBaseDto} from './dto/admin-base.dto'
import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {AppService} from '../../app.service'
import {CrudService} from '../../interfaces/crud-service.interface'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {applyPatch, normalisePatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ForbiddenException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {db} from '../../entities'
import {genSalt, hash} from 'bcrypt'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {Admin} from '../../entities/db/billing'
import {RBAC_ROLES} from '../../config/constants.config'
import {FindManyOptions} from 'typeorm'
import {isEmpty, ValidationError} from 'class-validator'
import {formatValidationErrors} from '../../helpers/errors.helper'

const SPECIAL_USER_LOGIN = 'sipwise'
const PERMISSION_DENIED = 'permission denied'

@Injectable()
export class AdminsService implements CrudService<AdminCreateDto, AdminResponseDto> {
    private readonly log = new Logger(AdminsService.name)

    constructor(
        private readonly app: AppService,
    ) {
    }

    toResponse(db: db.billing.Admin): AdminResponseDto {
        this.log.debug({message: 'converting admin to response', func: this.toResponse.name})
        return {
            billing_data: db.billing_data,
            call_data: db.call_data,
            can_reset_password: db.can_reset_password,
            email: db.email,
            id: db.id,
            is_active: db.is_active,
            is_ccare: db.is_ccare,
            is_master: db.is_master,
            is_superuser: db.is_superuser,
            is_system: db.is_system,
            lawful_intercept: db.lawful_intercept,
            login: db.login,
            read_only: db.read_only,
            reseller_id: db.reseller_id,
            show_passwords: db.show_passwords,
        }
    }

    @HandleDbErrors
    async create(admin: AdminCreateDto, req: ServiceRequest): Promise<AdminResponseDto> {
        this.log.debug({message: 'create admin', func: this.create.name, user: req.user.username})
        if (!await this.hasPermission(req.user, admin)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                user_score: await this.getPermissionScore(req.user),
                requested_score: await this.getPermissionScore(admin),
            })
            throw new ForbiddenException(PERMISSION_DENIED)
        }
        this.log.debug({
            message: 'check user permission level',
            success: true,
        })
        let dbAdmin = db.billing.Admin.create(admin)
        const role = await this.getRBACRole(dbAdmin)

        if (role != RBAC_ROLES.system && isEmpty(admin.reseller_id)) {
            let err = new ValidationError()
            err.property = 'reseller_id'
            err.constraints = {isNotEmpty: 'reseller_id should not be empty'}
            this.log.debug({message: 'reseller_id is empty'})
            throw new UnprocessableEntityException(formatValidationErrors([err]))
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
        let options: FindManyOptions = {take: rows, skip: rows * (page - 1)}
        if (req.user.is_master) {
            switch (req.user.role) {
                case RBAC_ROLES.reseller:
                    options.where = {reseller_id: req.user.reseller_id, is_superuser: false, is_system: false}
                    break
                case RBAC_ROLES.admin:
                    options.where = {is_system: false}
            }
        } else {
            options.where = {id: req.user.id}
        }
        const result = await db.billing.Admin.find(options)
        return result.map(adm => this.toResponse(adm))
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
            return this.toResponse(await db.billing.Admin.findOneOrFail(id))
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
        // check that reseller role can only request admins of same reseller_id
        if (req.user.role == RBAC_ROLES.reseller && entry.reseller_id != req.user.reseller_id) {
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
        let oldAdmin = await db.billing.Admin.findOneOrFail(id)

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

        let newAdmin = db.billing.Admin.merge(oldAdmin, admin)

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
        let oldAdmin = await db.billing.Admin.findOneOrFail(id)

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

        let newAdmin = this.inflate(admin)
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
        this.log.debug({message: 'update admin by id', func: this.update.name, user: req.user.username, id: id})
        if (req.user.id == id) {
            throw new ForbiddenException('cannot delete own user')
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

        // remove fields that are not changeable by self
        if (newAdmin.id == userId) {
            ['is_master', 'is_active', 'read_only', 'is_system', 'is_superuser'].map(s => {
                if (newAdmin[s] !== undefined) {
                    this.log.debug({message: 'cannot change field for self', id: userId, field: s})
                    delete newAdmin[s]
                }
            })
        }
        return newAdmin
    }

    private inflate(dto: AdminBaseDto): db.billing.Admin {
        return db.billing.Admin.create(dto)
    }

    private deflate(entry: db.billing.Admin): AdminBaseDto {
        return Object.assign(entry)
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
    private async hasPermission(curUser, newPermissions): Promise<boolean> {
        if (!curUser.is_master) {
            return false
        }
        let scoreDifference = await this.getPermissionScore(curUser) - await this.getPermissionScore(newPermissions)
        // returns true if scoreDifference >= 0; else false
        return scoreDifference >= 0
    }
}
