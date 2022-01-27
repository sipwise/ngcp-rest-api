import {AdminCreateDto} from './dto/admin-create.dto'
import {AdminResponseDto} from './dto/admin-response.dto'
import {AdminUpdateDto} from './dto/admin-update.dto'
import {AdminDto} from './dto/admin.dto'
import {AppService} from '../../app.service'
import {HandleDbErrors} from '../../decorators/handle-db-errors.decorator'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ForbiddenException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {genSalt, hash} from 'bcrypt'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AdminsRepository} from './admins.repository'
import {Messages} from '../../config/messages.config'

@Injectable()
export class AdminsService { // implements CrudService<AdminCreateDto, AdminResponseDto> {
    private readonly log = new Logger(AdminsService.name)

    constructor(
        private readonly app: AppService,
        private readonly dbRepo: AdminsRepository,
    ) {
    }

    async toResponse(admin: AdminDto): Promise<AdminResponseDto> {
        this.log.debug({message: 'converting admin to response', func: this.toResponse.name})
        return {
            billing_data: admin.billing_data,
            call_data: admin.call_data,
            can_reset_password: admin.can_reset_password,
            email: admin.email,
            id: admin.id,
            is_active: admin.is_active,
            is_ccare: admin.is_ccare,
            is_master: admin.is_master,
            is_superuser: admin.is_superuser,
            is_system: admin.is_system,
            lawful_intercept: admin.lawful_intercept,
            login: admin.login,
            read_only: admin.read_only,
            reseller_id: admin.reseller_id,
            reseller_id_expand: admin.reseller_id_expand,
            role: admin.role,
            show_passwords: admin.show_passwords,
        }
    }

    async create(adminCreate: AdminCreateDto, req: ServiceRequest): Promise<AdminResponseDto> {
        let admin: AdminDto = adminCreate

        const flags = await this.dbRepo.getPermissionFlags(admin.role)
        Object.assign(admin, flags)
        admin.role_id = await this.dbRepo.getRoleIdByRole(admin.role)

        this.log.debug({message: 'create admin', func: this.create.name, user: req.user.username})
        const ownRoleId = await this.dbRepo.getRoleIdByRole(req.user.role)
        if (!await this.dbRepo.hasPermission(ownRoleId, admin.role_id)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                role: req.user.role,
                requested_role: admin.role,
                is_master: req.user.is_master,
            })
            throw new ForbiddenException(Messages.invoke(Messages.PERMISSION_DENIED, req))
        }
        this.log.debug({
            message: 'check user permission level',
            success: true,
            role: req.user.role,
            is_master: req.user.is_master,
        })

        this.log.debug({message: 'create admin', func: this.create.name, user: req.user.username})

        if (req.user.reseller_id_required || admin.reseller_id == undefined) {
            admin.reseller_id = req.user.reseller_id
        }

        if (admin.password)
            admin.saltedpass = await this.generateSaltedpass(admin.password)

        return this.toResponse(await this.dbRepo.createAdmin(admin))
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

        return await Promise.all(
            (await this.dbRepo.readAllAdmin(page, rows, req)).map(
                async (admin) => this.toResponse(admin),
            ),
        )
    }

    @HandleDbErrors
    async read(id: number, req: ServiceRequest): Promise<AdminResponseDto> {
        this.log.debug({message: 'read admin by id', func: this.read.name, user: req.user.username, id: id})

        return this.toResponse(await this.dbRepo.readAdmin(id, req))
    }

    @HandleDbErrors
    async update(id: number, adminUpdate: AdminUpdateDto, req: ServiceRequest): Promise<AdminResponseDto> {
        this.log.debug({message: 'update admin by id', func: this.update.name, user: req.user.username, id: id})

        let admin: AdminDto = adminUpdate
        admin.id = id

        let oldAdmin: AdminDto = await this.dbRepo.readAdmin(id, req)
        await this.validateUpdate(req.user.id, oldAdmin, admin)

        if (admin.password)
            admin.saltedpass = await this.generateSaltedpass(admin.password)

        return this.toResponse(await this.dbRepo.updateAdmin(id, admin, req))
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
        let oldAdmin: AdminDto = await this.dbRepo.readAdmin(id, req)
        let admin: AdminDto = oldAdmin

        admin = applyPatch(admin, patch).newDocument
        admin.id = id

        const ownRoleId = await this.dbRepo.getRoleIdByRole(req.user.role)
        if (admin.role)
            admin.role_id = await this.dbRepo.getRoleIdByRole(admin.role)

        if (!await this.dbRepo.hasPermission(ownRoleId, admin.role_id)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                role: req.user.role,
                requested_role: admin.role,
                is_master: req.user.is_master,
            })
            throw new ForbiddenException(Messages.invoke(Messages.PERMISSION_DENIED, req), Messages.invoke(Messages.INVALID_USER_ROLE, req).description)
        }

        if (admin.password)
            admin.saltedpass = await this.generateSaltedpass(admin.password)

        await this.validateUpdate(req.user.id, oldAdmin, admin)

        return this.toResponse(await this.dbRepo.updateAdmin(id, admin, req))
    }

    @HandleDbErrors
    async delete(id: number, req: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete admin by id', func: this.delete.name, user: req.user.username, id: id})

        if (id == req.user.id)
            throw new UnprocessableEntityException(Messages.invoke(Messages.DELETE_OWN_USER, req))

        return await this.dbRepo.deleteAdmin(id, req)
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
    async validateUpdate(selfId: number, oldAdmin: AdminDto, admin: AdminDto): Promise<boolean> {
        if (admin.id == selfId) {
            ['login', 'role', 'is_master', 'is_active',
                'is_system', 'is_superuser', 'lawful_intercept',
                'read_only', 'show_passwords',
                'call_data', 'billing_data'].map(s => {
                if (admin[s] && (!oldAdmin[s] || oldAdmin[s] != admin[s])) {
                    this.log.debug({message: 'Cannot change own property', id: selfId, field: s})
                    throw new ForbiddenException(Messages.invoke(Messages.PERMISSION_DENIED), Messages.invoke(Messages.CHANGE_OWN_PROPERTY).description)
                }
            })
        }
        return true
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
}
