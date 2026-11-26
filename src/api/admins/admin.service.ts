import {HttpStatus, Inject, Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {AdminOptions} from './interfaces/admin-options.interface'
import {AdminPasswordJournalMariadbRepository} from './repositories/admin-password-journal.mariadb.repository'
import {AdminMariadbRepository} from './repositories/admin.mariadb.repository'

import {AppService} from '~/app.service'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {Dictionary} from '~/helpers/dictionary.helper'
import {apiError, checkItems, idPointer, itemPointer, throwMissingIds} from '~/helpers/errors.helper'
import {isPasswordInJournal, passwordJournalHash} from '~/helpers/password.helper'
import {mapYield} from '~/helpers/yield.helper'
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
        const roles = await this.readRoles(admins, sr)
        await checkItems(admins, async (admin, key) => {
            await this.populateAdmin(admin, roles, sr, key)
            if (admin.enable2fa) {
                if (!admin.otpSecret)
                    admin.otpSecret = this.authService.generateOtpSecretKey()

                admin.otpInit = true
            } else {
                admin.otpInit = false
                admin.otpSecret = null
            }
        })

        const createdIds = await this.adminRepo.create(admins)
        admins.forEach((admin, index) => {
            admin.id = createdIds[index]
        })
        await this.insertPasswordJournals(admins)
        const created = await this.adminRepo.readWhereInIds(createdIds, this.getAdminOptionsFromServiceRequest(sr))

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
        const options = this.getAdminOptionsFromServiceRequest(sr)
        const admins = await this.adminRepo.readWhereInIds(ids, options)
        throwMissingIds(sr, ids, admins.map(admin => admin.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const oldAdmins = new Map(admins.map(admin => [admin.id, admin]))
        const roles = await this.readRoles(Object.values(updates), sr)
        const journalSize = this.passwordJournalSize()
        const journals = await this.readPasswordJournals(ids.filter(id => updates[id].password))

        await checkItems(updates, async (admin, key) => {
            const id = +key
            admin.id = id  // TODO: Do we want to set the id here? After validation in controller it should not be possible to receive updates where the id in the update does not equal the key id
            await this.populateAdmin(admin, roles, sr, key)
            const lastPasswords = journals.get(id)?.slice(0, journalSize).map(journal => journal.value)
            if (admin.password && lastPasswords && await isPasswordInJournal(admin.password, lastPasswords))
                throw apiError(this.i18n.t('errors.PASSWORD_ALREADY_USED'), itemPointer(sr, key, admin, 'password'))
            const oldAdmin = oldAdmins.get(id)
            if (oldAdmin.role == RbacRole.lintercept && !this.canManageLintercept(sr))
                throw apiError(this.i18n.t('errors.PERMISSION_DENIED'), itemPointer(sr, key, admin, 'role'), HttpStatus.FORBIDDEN)
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

            this.validateUpdate(sr.user.id, oldAdmin, admin, sr, key)
        })

        await this.insertPasswordJournals(Object.values(updates))
        // every admin with journals got a new entry, so only its newest journalSize - 1 old ones stay
        const staleIds = [...journals.values()].flatMap(old => old.slice(journalSize - 1)).map(journal => journal.id)
        if (staleIds.length)
            await this.adminPasswordJournalRepo.delete(staleIds)
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
            throw apiError(this.i18n.t('errors.ADMIN_DELETE_SELF'), idPointer(sr, sr.user.id), HttpStatus.FORBIDDEN)

        const options =  this.getAdminOptionsFromServiceRequest(sr)
        const deleteIds = await this.adminRepo.readWhereInIds(ids, options)
        throwMissingIds(sr, ids, deleteIds.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))
        const lintercept = deleteIds.find(admin => admin.role == RbacRole.lintercept)
        if (lintercept && !this.canManageLintercept(sr))
            throw apiError(this.i18n.t('errors.PERMISSION_DENIED'), idPointer(sr, lintercept.id), HttpStatus.FORBIDDEN)
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
    private canManageLintercept(sr: ServiceRequest): boolean {
        return sr.user.role == RbacRole.system && sr.user.is_master === true
    }

    private async readRoles(admins: internal.Admin[], sr: ServiceRequest): Promise<Map<string, internal.AclRole>> {
        const names = new Set([sr.user.role, ...admins.map(admin => admin.role)])
        const roles = await this.aclRepo.readByRoles([...names])
        return new Map(roles.map(role => [role.role, role]))
    }

    /**
     * Number of last passwords an admin may not reuse, 0 if the journal is disabled
     */
    private passwordJournalSize(): number {
        const {web_validate, web_keep_last_used} = this.app.config.security.password
        return web_validate ? web_keep_last_used : 0
    }

    /**
     * Password journals of the admins, newest first; none if the journal is disabled
     */
    private async readPasswordJournals(adminIds: number[]): Promise<Map<number, internal.AdminPasswordJournal[]>> {
        const journals = new Map<number, internal.AdminPasswordJournal[]>()
        if (!adminIds.length || !this.passwordJournalSize())
            return journals
        for (const journal of await this.adminPasswordJournalRepo.readByAdminIds(adminIds)) {
            if (!journals.has(journal.admin_id))
                journals.set(journal.admin_id, [])
            journals.get(journal.admin_id).push(journal)
        }
        return journals
    }

    private async insertPasswordJournals(admins: internal.Admin[]): Promise<void> {
        const changed = admins.filter(admin => admin.password)
        if (!changed.length || !this.passwordJournalSize())
            return
        const journals = await mapYield(changed, async admin => internal.AdminPasswordJournal.create({
            admin_id: admin.id,
            value: await passwordJournalHash(admin.password),
        }))
        await this.adminPasswordJournalRepo.create(journals)
    }

    private async populateAdmin(admin: internal.Admin, roles: Map<string, internal.AclRole>, sr: ServiceRequest, key: number | string): Promise<void> {
        const role = roles.get(admin.role)
        const accessorRole = roles.get(sr.user.role)
        admin.setPermissionFlags()
        admin.roleId = role.id
        admin.roleData = role

        if (!accessorRole.hasPermission(role.id, sr.user.is_master)) {
            this.log.debug({
                message: 'check user permission level',
                success: false,
                role: sr.user.role,
                requested_role: admin.role,
                is_master: sr.user.is_master,
            })
            throw apiError(this.i18n.t('errors.PERMISSION_DENIED'), itemPointer(sr, key, admin, 'role'), HttpStatus.FORBIDDEN)
        }
        if (admin.role == RbacRole.lintercept && !this.canManageLintercept(sr))
            throw apiError(this.i18n.t('errors.PERMISSION_DENIED'), itemPointer(sr, key, admin, 'role'), HttpStatus.FORBIDDEN)

        if (admin.password) {
            admin.saltedpass = await admin.generateSaltedpass()
            admin.saltedpassModifyTimestamp = new Date()
        }

        if (sr.user.reseller_id_required) {
            admin.resellerId = sr.user.reseller_id
        }
    }

    /**
     * Prevents change of passwords of other admin users and prevents change of
     * protected fields when updating self (admin.id == user.id)
     * @param selfId
     * @param oldAdmin
     * @param admin
     * @param sr
     * @param key id of the item in the request
     */
    private validateUpdate(selfId: number, oldAdmin: internal.Admin, admin: internal.Admin, sr: ServiceRequest, key: number | string): void {
        if (admin.id != selfId)
            return
        const protectedFields: (keyof internal.Admin)[] = ['login', 'role', 'isMaster', 'isActive',
            'readOnly', 'showPasswords', 'callData', 'billingData']
        for (const field of protectedFields) {
            if (admin[field] != undefined && (oldAdmin[field] == undefined || oldAdmin[field] != admin[field])) {
                this.log.debug({message: 'Cannot change own property', id: selfId, field: field})
                throw apiError(this.i18n.t('errors.ADMIN_CHANGE_PROPERTY_SELF'), itemPointer(sr, key, admin, field), HttpStatus.FORBIDDEN)
            }
        }
    }

}
