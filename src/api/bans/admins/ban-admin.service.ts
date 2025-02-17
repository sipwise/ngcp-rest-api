import {Injectable, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {BanAdminMariadbRepository} from './repositories/ban-admin.mariadb.repository'

import {BanAdminOptions} from '~/api/bans/admins/interfaces/ban-admin-options.interface'
import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class BanAdminService implements CrudService<internal.BanAdmin> {
    private readonly log = new LoggerService(BanAdminService.name)

    constructor(
        private readonly i18n: I18nService,
        private readonly authService: AuthService,
        private readonly banAdminRepo: BanAdminMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.BanAdmin[], number]> {
        const redisBans = await this.authService.readBannedAdminIds()
        return this.banAdminRepo.readAll(this.getAdminOptionsFromServiceRequest(sr), sr, {ids:redisBans})
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.BanAdmin> {
        if (!await this.authService.isAdminBanned(id))
            throw new NotFoundException()

        return await this.banAdminRepo.readById(id, this.getAdminOptionsFromServiceRequest(sr), sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.log.debug({message: 'delete many ban admins by id', func: this.delete.name, user: sr.user.username, ids: ids})

        // FIXME: For some reaason the ids are string, not number
        const adminIds = await this.authService.filterNotBannedAdmins(ids.map(id => +id))
        if (!adminIds.length) {
            throw new NotFoundException()
        } else if (adminIds.length != ids.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const idsToDelete = await this.banAdminRepo.readWhereInIds(adminIds, this.getAdminOptionsFromServiceRequest(sr), sr)
        if (idsToDelete.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != idsToDelete.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        await Promise.all(idsToDelete.map(async admin => {
            await this.authService.removeAdminBan(admin.id, sr)
        }))

        return adminIds
    }

    getAdminOptionsFromServiceRequest(sr: ServiceRequest): BanAdminOptions {
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
}
