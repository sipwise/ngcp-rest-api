import {AppService} from '../../app.service'
import {applyPatch, Operation as PatchOperation} from '../../helpers/patch.helper'
import {ForbiddenException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {AdminMariadbRepository} from './repositories/admin.mariadb.repository'
import {internal} from '../../entities'
import {AclRoleRepository} from '../../repositories/acl-role.repository'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {deepCopy} from '../../helpers/deep-copy.helper'
import {AdminOptions} from './interfaces/admin-options.interface'
import {Dictionary} from '../../helpers/dictionary.helper'

@Injectable()
export class AdminService { //} implements CrudService<internal.Admin> {
    private readonly log = new LoggerService(AdminService.name)

    constructor(
        private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(AdminMariadbRepository) private readonly adminRepo: AdminMariadbRepository,
        @Inject(AclRoleRepository) private readonly aclRepo: AclRoleRepository,
    ) {
    }

    async create(admins: internal.Admin[], sr: ServiceRequest): Promise<internal.Admin[]> {
        const accessorRole = await this.aclRepo.readOneByRole(sr.user.role, sr) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        for (const admin of admins) {
            await this.populateAdmin(admin, accessorRole, sr)
        }
        const createdIds = await this.adminRepo.create(admins)
        return await this.adminRepo.readWhereInIds(createdIds, this.getAdminOptionsFromServiceRequest(sr))
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        this.log.debug({
            message: 'read all admins',
            func: this.readAll.name,
            user: sr.user.username,
        })
        return await this.adminRepo.readAll(this.getAdminOptionsFromServiceRequest(sr), sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'read admin by id', func: this.read.name, user: sr.user.username, id: id})
        return await this.adminRepo.readById(id, this.getAdminOptionsFromServiceRequest(sr))
    }

    async update(updates: Dictionary<internal.Admin>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        if (ids.length != await this.adminRepo.readCountOfIds(ids, this.getAdminOptionsFromServiceRequest(sr))) {
            throw new UnprocessableEntityException()
        }

        const accessorRole = await this.aclRepo.readOneByRole(sr.user.role, sr)
        const options = this.getAdminOptionsFromServiceRequest(sr)

        for (const id of ids) {
            const admin = updates[id]
            admin.id = id  // TODO: Do we want to set the id here? After validation in controller it should not be possible to receive updates where the id in the update does not equal the key id
            await this.populateAdmin(admin, accessorRole, sr)

            const oldAdmin = await this.adminRepo.readById(id, options)

            await this.validateUpdate(sr.user.id, oldAdmin, admin)
        }
        return await this.adminRepo.update(updates, options)
    }

    async updateOrCreate(id: number, admin: internal.Admin, sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({
            message: 'update admin by id or create',
            func: this.update.name,
            user: sr.user.username,
            id: id,
        })
        const options = this.getAdminOptionsFromServiceRequest(sr)
        const data = new Dictionary<internal.Admin>()
        data[id] = admin
        try {
            await this.adminRepo.readById(id, options)
            const ids = await this.update(data, sr)
            return await this.adminRepo.readById(ids[0], options)
        } catch (e) {
            return (await this.create([admin], sr))[0]
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
        const options =  this.getAdminOptionsFromServiceRequest(sr)
        let admin = await this.adminRepo.readById(id, options)
        const oldAdmin = deepCopy(admin)

        admin = applyPatch(admin, patch).newDocument
        admin.role ||= oldAdmin.role
        admin.id = id

        await this.populateAdmin(admin, accessorRole, sr)

        await this.validateUpdate(sr.user.id, oldAdmin, admin)

        const updates = new Dictionary<internal.Admin>()
        updates[id] = admin
        const ids = await this.adminRepo.update(updates, options)
        return await this.adminRepo.readById(ids[0], options)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.log.debug({message: 'delete many admin by id', func: this.delete.name, user: sr.user.username, ids: ids})

        if (ids.includes(sr.user.id))
            throw new ForbiddenException(this.i18n.t('errors.ADMIN_DELETE_SELF'))

        const options =  this.getAdminOptionsFromServiceRequest(sr)
        const deleteIds = await this.adminRepo.readWhereInIds(ids, options)
        if(ids.length != deleteIds.length)
            throw new UnprocessableEntityException()
        return await this.adminRepo.delete(ids)
    }

    getAdminOptionsFromServiceRequest(sr: ServiceRequest): AdminOptions {
        const hasAccessTo = sr.user.role_data.has_access_to.map(role => role.id)
        return {
            filterBy: {
                resellerId: sr.user.reseller_id,
                userId: sr.user.id,
            },
            hasAccessTo:hasAccessTo,
            isMaster: sr.user.is_master,
        }
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
