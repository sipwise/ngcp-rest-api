import {ForbiddenException, Inject, Injectable, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {AdminOptions} from './interfaces/admin-options.interface'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {AdminMariadbRepository} from './repositories/admin.mariadb.repository'

import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {AdminPasswordJournal} from '~/entities/internal'
import {Dictionary} from '~/helpers/dictionary.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'
import {AclRoleRepository} from '~/repositories/acl-role.repository'

@Injectable()
export class AdminService { //} implements CrudService<internal.Admin> {
    private readonly log = new LoggerService(AdminService.name)

    constructor(
        @Inject(AppService) private readonly app: AppService,
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(AdminMariadbRepository) private readonly adminRepo: AdminMariadbRepository,
        @Inject(AdminPasswordJournalMariadbRepository) private readonly adminPasswordJournalRepo: AdminPasswordJournalMariadbRepository,
        @Inject(AclRoleRepository) private readonly aclRepo: AclRoleRepository,
        @Inject(AuthService) private readonly authService: AuthService,
    ) {
    }

    async create(admins: internal.Admin[], sr: ServiceRequest): Promise<internal.Admin[]> {
        const accessorRole = await this.aclRepo.readOneByRole(sr.user.role, sr) // TODO: changing req.user.role to internal.AclRole would remove redundant db call
        for (const admin of admins) {
            await this.populateAdmin(admin, accessorRole, sr)
            if (admin.enable2fa) {
                if (!admin.otpSecret)
                    admin.otpSecret = this.authService.generateOtpSecretKey()

                admin.otpInit = true
            } else {
                admin.otpInit = false
                admin.otpSecret = null
            }
        }

        const createdIds = await this.adminRepo.create(admins)
        const created = await this.adminRepo.readWhereInIds(createdIds, this.getAdminOptionsFromServiceRequest(sr))

        const keepPasswordAmount = this.app.config.security.password.web_keep_last_used
        if (this.app.config.security.password.web_validate && this.app.config.security.password.web_keep_last_used > 0) {
            for (const admin of admins) {
                if (admin.password) {
                    const createdAdmin = created.find(a => a.login == admin.login)
                    if (createdAdmin) {
                        admin.id = createdAdmin.id
                        const journalHash = await admin.generateSaltedpass(6)
                        const journal = AdminPasswordJournal.create({admin_id: admin.id, value: journalHash})
                        await this.adminPasswordJournalRepo.create([journal])
                        await this.adminPasswordJournalRepo.keepLastNPasswords(admin.id, keepPasswordAmount)
                    }
                }
            }
        }

        for (const admin of created) {
            if (admin.id != sr.user.id) {
                delete admin.otpSecret
            }
        }

        return created
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Admin[], number]> {
        this.log.debug({
            message: 'read all admins',
            func: this.readAll.name,
            user: sr.user.username,
        })
        const result = await this.adminRepo.readAll(this.getAdminOptionsFromServiceRequest(sr), sr)
        for (const admin of result[0]) {
            if (admin.id != sr.user.id) {
                delete admin.otpSecret
            }
        }
        return result
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Admin> {
        this.log.debug({message: 'read admin by id', func: this.read.name, user: sr.user.username, id: id})
        const result = await this.adminRepo.readById(id, this.getAdminOptionsFromServiceRequest(sr))

        if (result.id != sr.user.id)
            delete result.otpSecret

        return result
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
            // check for toggle
            if (oldAdmin.enable2fa != admin.enable2fa) {
                if (admin.enable2fa) {
                    if (!admin.otpSecret)
                        admin.otpSecret = this.authService.generateOtpSecretKey()
                    admin.otpInit = true
                }
                else {
                    admin.otpInit = false
                    admin.otpSecret = null // TODO: This doesnt work right now because the adminRepo.update removes even null values
                }
            }

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
        } catch {
            return (await this.create([admin], sr))[0]
        }
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
        const hasAccessTo = sr.user.role_data.has_access_to.map((role: {id: number}) => role.id)
        let resellerId: number
        if (sr.user.role == RbacRole.reseller || sr.user.role == RbacRole.ccare)
            resellerId = sr.user.reseller_id
        return {
            filterBy: {
                resellerId: resellerId,
                userId: sr.user.id,
            },
            hasAccessTo:hasAccessTo,
            isMaster: sr.user.is_master,
        }
    }
    private async populateAdmin(admin: internal.Admin, accessorRole: internal.AclRole, sr: ServiceRequest): Promise<void> {
        const role = await this.aclRepo.readOneByRole(admin.role, sr)
        await admin.setPermissionFlags()
        admin.roleId = role.id
        admin.roleData = role

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

        if (admin.password) {
            admin.saltedpass = await admin.generateSaltedpass()
            admin.saltedpassModifyTimestamp = new Date()
            if (admin.id &&
                this.app.config.security.password.web_validate &&
                this.app.config.security.password.web_keep_last_used > 0
            ) {
                const lastPasswords = await this.adminPasswordJournalRepo.readLastNPasswords(admin.id, this.app.config.security.password.web_keep_last_used)
                for (const pass of lastPasswords) {
                    const [storedSalt, storedHash] = pass.value.split('$')
                    const generatedHash = await admin.generateSaltedpass(6, storedSalt)
                    if (generatedHash.split('$')[1] === storedHash) {
                        throw new UnprocessableEntityException(this.i18n.t('errors.PASSWORD_ALREADY_USED'))
                    }
                }
                const journalHash = await admin.generateSaltedpass(6)
                const journal = AdminPasswordJournal.create({admin_id: admin.id, value: journalHash})
                const keepPasswordAmount = this.app.config.security.password.web_keep_last_used
                await this.adminPasswordJournalRepo.create([journal])
                await this.adminPasswordJournalRepo.keepLastNPasswords(admin.id, keepPasswordAmount)
            }
        }

        if (sr.user.reseller_id_required || admin.resellerId == undefined) {
            admin.resellerId = sr.user.reseller_id
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
            ['login', 'role', 'isMaster', 'isActive',
                'isSystem', 'isSuperuser', 'lawfulIntercept',
                'readOnly', 'showPasswords',
                'callData', 'billingData'].map(s => {
                if (admin[s] != undefined && (oldAdmin[s] == undefined || oldAdmin[s] != admin[s])) {
                    this.log.debug({message: 'Cannot change own property', id: selfId, field: s})
                    throw new ForbiddenException(this.i18n.t('errors.ADMIN_CHANGE_PROPERTY_SELF'))
                }
            })
        }
        return true
    }

}
