import {AppService} from '../../app.service'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ForbiddenException, Injectable, Logger, UnprocessableEntityException} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AdminsMariadbRepository} from './repositories/admins.mariadb.repository'
import {Messages} from '../../config/messages.config'
import {internal} from '../../entities'
import {AclRoleRepository} from '../../repositories/acl-role.repository'
import {deepCopy} from '../../repositories/acl-role.mock.repository'

@Injectable()
export class AdminsService { //} implements CrudService<AdminCreateDto, AdminResponseDto> {
    private readonly log = new Logger(AdminsService.name)

    constructor(
        private readonly app: AppService,
        private readonly adminRepo: AdminsMariadbRepository,
        private readonly aclRepo: AclRoleRepository,
    ) {
    }

    async create(admin: internal.Admin, req: ServiceRequest): Promise<internal.Admin> {
        await admin.setPermissionFlags()
        const role = await this.aclRepo.readOneByRole(admin.role, req)

        admin.role_id = role.id  // TODO: admin.role already contains id
        admin.role_data = role

        this.log.debug({message: 'create admin', func: this.create.name, user: req.user.username})
        const requestRole = await this.aclRepo.readOneByRole(req.user.role, req) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        if (!await requestRole.hasPermission(admin.role_id)) {
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
            await admin.generateSaltedpass()

        return await this.adminRepo.create(admin)
    }

    async readAll(page: number, rows: number, req: ServiceRequest): Promise<internal.Admin[]> {
        this.log.debug({
            message: 'read all admins',
            func: this.readAll.name,
            user: req.user.username,
            page: page,
            rows: rows,
        })

        return (await this.adminRepo.readAll(page, rows, req))
    }

    async read(id: number, req: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'read admin by id', func: this.read.name, user: req.user.username, id: id})
        return await this.adminRepo.readById(id, req)
    }

    async update(id: number, admin: internal.Admin, req: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'update admin by id', func: this.update.name, user: req.user.username, id: id})

        await admin.setPermissionFlags()

        const role = await this.aclRepo.readOneByRole(admin.role, req)

        const requestRole = await this.aclRepo.readOneByRole(req.user.role, req) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        if (!await requestRole.hasPermission(role.id)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                role: req.user.role,
                requested_role: admin.role,
                is_master: req.user.is_master,
            })
            throw new ForbiddenException(Messages.invoke(Messages.PERMISSION_DENIED, req), Messages.invoke(Messages.INVALID_USER_ROLE, req).description)
        }

        admin.id = id
        admin.role_id = role.id
        admin.role_data = role

        const oldAdmin = await this.adminRepo.readById(id, req)
        await this.validateUpdate(req.user.id, oldAdmin, admin)

        if (admin.password)
            await admin.generateSaltedpass()

        return await this.adminRepo.update(id, admin, req)
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({
            message: 'patching admin',
            func: this.adjust.name,
            user: req.user.username,
            id: id,
            patch: patch,
        })
        let admin = await this.adminRepo.readById(id, req)
        const oldAdmin = deepCopy(admin)

        admin = applyPatch(admin, patch).newDocument
        admin.id = id
        await admin.setPermissionFlags()

        const role = await this.aclRepo.readOneByRole(admin.role, req)
        const requestRole = await this.aclRepo.readOneByRole(req.user.role, req) // TODO: changing req.user.role to internal.AclRole would remove redundant db call

        if (!await requestRole.hasPermission(role.id)) {
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
            await admin.generateSaltedpass()

        await this.validateUpdate(req.user.id, oldAdmin, admin)

        return await this.adminRepo.update(id, admin, req)
    }

    async delete(id: number, req: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete admin by id', func: this.delete.name, user: req.user.username, id: id})

        if (id == req.user.id)
            throw new UnprocessableEntityException(Messages.invoke(Messages.DELETE_OWN_USER, req)) // TODO: should we use forbidden?

        return await this.adminRepo.delete(id, req)
    }

    /**
     * Prevents change of passwords of other admin users and prevents change of
     * protected fields when updating self (admin.id == user.id)
     * @param oldAdmin
     * @param admin
     * @param selfId
     * @private
     *
     * @returns admin object used to update the current entry
     */
    private async validateUpdate(selfId: number, oldAdmin: internal.Admin, admin: internal.Admin): Promise<boolean> {
        if (admin.id == selfId) {
            ['login', 'role', 'is_master', 'is_active',
                'is_system', 'is_superuser', 'lawful_intercept',
                'read_only', 'show_passwords',
                'call_data', 'billing_data'].map(s => {
                if (admin[s] != undefined && (oldAdmin[s] == undefined || oldAdmin[s] != admin[s])) {
                    this.log.debug({message: 'Cannot change own property', id: selfId, field: s})
                    throw new ForbiddenException(Messages.invoke(Messages.PERMISSION_DENIED), Messages.invoke(Messages.CHANGE_OWN_PROPERTY).description)
                }
            })
        }

        return true
    }

}
