import {AppService} from '../../app.service'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ForbiddenException, Inject, Injectable} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AdminMariadbRepository} from './repositories/admin.mariadb.repository'
import {internal} from '../../entities'
import {AclRoleRepository} from '../../repositories/acl-role.repository'
import {CrudService} from '../../interfaces/crud-service.interface'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {deepCopy} from '../../helpers/deep-copy.helper'

@Injectable()
export class AdminService implements CrudService<internal.Admin> {
    private readonly log = new LoggerService(AdminService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(AdminMariadbRepository) private readonly adminRepo: AdminMariadbRepository,
        @Inject(AclRoleRepository) private readonly aclRepo: AclRoleRepository,
    ) {
    }

    async create(admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'create admin', func: this.create.name, user: sr.user.username})

        const accessorRole = await this.aclRepo.readOneByRole(sr.user.role, sr) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        await this.populateAdmin(admin, accessorRole, sr)

        return await this.adminRepo.create(admin)
    }

    async createMany(admins: internal.Admin[], sr: ServiceRequest): Promise<internal.Admin[]> {
        const accessorRole = await this.aclRepo.readOneByRole(sr.user.role, sr) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        for (const admin of admins) {
            await this.populateAdmin(admin, accessorRole, sr)
        }
        return await this.adminRepo.createMany(admins)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        this.log.debug({
            message: 'read all admins',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.adminRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'read admin by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.adminRepo.readById(id, sr)
    }

    async update(id: number, admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'update admin by id', func: this.update.name, user: sr.user.username, id: id})
        admin.id = id

        const accessorRole = await this.aclRepo.readOneByRole(sr.user.role, sr) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        await this.populateAdmin(admin, accessorRole, sr)

        const oldAdmin = await this.adminRepo.readById(id, sr)
        await this.validateUpdate(sr.user.id, oldAdmin, admin)

        return await this.adminRepo.update(id, admin, sr)
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

    async adjust(id: number, patch: PatchOperation | PatchOperation[], sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({
            message: 'patching admin',
            func: this.adjust.name,
            user: sr.user.username,
            id: id,
        })
        const accessorRole = await this.aclRepo.readOneByRole(sr.user.role, sr) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        let admin = await this.adminRepo.readById(id, sr)
        const oldAdmin = deepCopy(admin)

        admin = applyPatch(admin, patch).newDocument
        admin.role ||= oldAdmin.role
        admin.id = id

        await this.populateAdmin(admin, accessorRole, sr)

        await this.validateUpdate(sr.user.id, oldAdmin, admin)

        return await this.adminRepo.update(id, admin, sr)
    }

    async delete(id: number, sr: ServiceRequest): Promise<number> {
        this.log.debug({message: 'delete admin by id', func: this.delete.name, user: sr.user.username, id: id})

        if (id == sr.user.id)
            throw new ForbiddenException(this.i18n.t('errors.ADMIN_DELETE_SELF'))

        return await this.adminRepo.delete(id, sr)
    }

    private async populateAdmin(admin: internal.Admin, accessorRole: internal.AclRole, sr: ServiceRequest) {
        const role = await this.aclRepo.readOneByRole(admin.role, sr)
        await admin.setPermissionFlags()
        admin.role_id = role.id
        admin.role_data = role

        if (!await accessorRole.hasPermission(role.id, sr.user.is_master)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                role: sr.user.role,
                requested_role: admin.role,
                is_master: sr.user.is_master,
            })
            throw new ForbiddenException(
                this.i18n.t('errors.PERMISSION_DENIED'),
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
                    throw new ForbiddenException(this.i18n.t('errors.ADMIN_CHANGE_PROPERTY_SELF'))
                }
            })
        }
        return true
    }
}
