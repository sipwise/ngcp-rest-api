import {AppService} from '../../app.service'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ForbiddenException, Injectable, Logger} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AdminsMariadbRepository} from './repositories/admins.mariadb.repository'
import {Messages} from '../../config/messages.config'
import {internal} from '../../entities'
import {AclRoleRepository} from '../../repositories/acl-role.repository'
import {deepCopy} from '../../repositories/acl-role.mock.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'

@Injectable()
export class AdminsService implements CrudService<internal.Admin> {
    private readonly log = new LoggerService(AdminsService.name)

    constructor(
        private readonly app: AppService,
        private readonly adminRepo: AdminsMariadbRepository,
        private readonly aclRepo: AclRoleRepository,
    ) {
    }

    async create(admin: internal.Admin, req: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'create admin', func: this.create.name, user: req.user.username})

        await this.populateAdmin(admin, req)

        return await this.adminRepo.create(admin)
    }

    async readAll(req: ServiceRequest): Promise<[internal.Admin[], number]> {
        this.log.debug({
            message: 'read all admins',
            func: this.readAll.name,
            user: req.user.username,
        })

        return await this.adminRepo.readAll(req)
    }

    async read(id: number, req: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'read admin by id', func: this.read.name, user: req.user.username, id: id})
        return await this.adminRepo.readById(id, req)
    }

    async update(id: number, admin: internal.Admin, req: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'update admin by id', func: this.update.name, user: req.user.username, id: id})
        admin.id = id
        await this.populateAdmin(admin, req)

        const oldAdmin = await this.adminRepo.readById(id, req)
        await this.validateUpdate(req.user.id, oldAdmin, admin)

        return await this.adminRepo.update(id, admin, req)
    }

    async updateOrCreate(id: number, admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'update admin by id or create', func: this.update.name, user: sr.user.username, id: id})
        admin.id = id
        try {
            await this.adminRepo.readById(id, sr)
            return await this.update(id, admin, sr)
        } catch (e) {
            return await this.create(admin, sr)
        }
    }

    async adjust(id: number, patch: PatchOperation | PatchOperation[], req: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({
            message: 'patching admin',
            func: this.adjust.name,
            user: req.user.username,
            id: id,
        })
        let admin = await this.adminRepo.readById(id, req)
        const oldAdmin = deepCopy(admin)

        admin = applyPatch(admin, patch).newDocument
        admin.role ||= oldAdmin.role
        admin.id = id

        await this.populateAdmin(admin, req)

        await this.validateUpdate(req.user.id, oldAdmin, admin)

        return await this.adminRepo.update(id, admin, req)
    }

    async delete(id: number, req: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete admin by id', func: this.delete.name, user: req.user.username, id: id})

        if (id == req.user.id)
            throw new ForbiddenException(Messages.invoke(Messages.DELETE_OWN_USER, req))

        return await this.adminRepo.delete(id, req)
    }

    private async populateAdmin(admin: internal.Admin, sr: ServiceRequest) {
        const role = await this.aclRepo.readOneByRole(admin.role, sr)
        await admin.setPermissionFlags()
        admin.role_id = role.id
        admin.role_data = role

        const requestRole = await this.aclRepo.readOneByRole(sr.user.role, sr) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        if (!await requestRole.hasPermission(role.id)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                role: sr.user.role,
                requested_role: admin.role,
                is_master: sr.user.is_master,
            })
            throw new ForbiddenException(
                Messages.invoke(Messages.PERMISSION_DENIED, sr),
                Messages.invoke(Messages.INVALID_USER_ROLE, sr).description,
            )
        }
        if (admin.password)
            await admin.generateSaltedpass()

        if (sr.user.reseller_id_required || admin.reseller_id == undefined) {
            admin.reseller_id = sr.user.reseller_id
        }
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
                    throw new ForbiddenException(
                        Messages.invoke(Messages.PERMISSION_DENIED),
                        Messages.invoke(Messages.CHANGE_OWN_PROPERTY).description,
                    )
                }
            })
        }
        return true
    }

}
