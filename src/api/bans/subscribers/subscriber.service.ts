import {Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {BanSubscriberOptions} from './interfaces/subscriber-options.interface'
import {BanSubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'

import {AuthService} from '~/auth/auth.service'
import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {throwMissingIds} from '~/helpers/errors.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class BanSubscriberService implements CrudService<internal.BanSubscriber> {
    private readonly log = new LoggerService(BanSubscriberService.name)

    constructor(
        private readonly i18n: I18nService,
        private readonly authService: AuthService,
        private readonly banSubscriberRepo: BanSubscriberMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.BanSubscriber[], number]> {
        const redisBans = await this.authService.readBannedSubscriberIds()
        const options = this.getSubscriberOptionsFromServiceRequest(sr)
        options.filterBy.ids = redisBans
        return this.banSubscriberRepo.readAll(options, sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.BanSubscriber> {
        if (!await this.authService.isSubscriberBanned(id))
            throw new NotFoundException()

        return await this.banSubscriberRepo.readById(id, this.getSubscriberOptionsFromServiceRequest(sr), sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        this.log.debug({message: 'delete many ban subscribers by id', func: this.delete.name, user: sr.user.username, ids: ids})
        const billingSubscriberIds = await this.authService.filterNotBannedSubscribers(ids.map(id => +id))
        throwMissingIds(sr, ids, billingSubscriberIds, this.i18n.t('errors.ENTRY_NOT_FOUND'))

        const idsToDelete = await this.banSubscriberRepo.readWhereInIds(
            ids,
            this.getSubscriberOptionsFromServiceRequest(sr),
            sr,
        )
        throwMissingIds(sr, ids, idsToDelete.map(entry => entry.id), this.i18n.t('errors.ENTRY_NOT_FOUND'))

        await Promise.all(idsToDelete.map(async subscriber => {
            await this.authService.removeSubscriberBan(subscriber.id,sr)
        }))

        return ids
    }

    getSubscriberOptionsFromServiceRequest(sr: ServiceRequest): BanSubscriberOptions {
        switch(sr.user.role) {
            case RbacRole.system:
            case RbacRole.admin:
            case RbacRole.lintercept:
            case RbacRole.ccareadmin:
                return {
                    filterBy: {},
                }
            case RbacRole.reseller:
            case RbacRole.ccare:
                return {
                    filterBy: {
                        resellerId: sr.user.reseller_id,
                    },
                }
            case RbacRole.subscriberadmin:
                return {
                    filterBy: {
                        customerId: sr.user.customer_id,
                    },
                }
            default:
                throw new NotFoundException()
        }
    }
}
