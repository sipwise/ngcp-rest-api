import {ForbiddenException, Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {SubscriberScope} from './interfaces/subscriber.repository'
import {SubscriberMariadbRepository} from './repositories/subscriber.mariadb.repository'

import {RbacRole} from '~/config/constants.config'
import {internal} from '~/entities'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class SubscriberService implements CrudService<internal.Subscriber> {
    private readonly log = new LoggerService(SubscriberService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(SubscriberMariadbRepository) private readonly subscriberRepo: SubscriberMariadbRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.Subscriber[], number]> {
        return await this.subscriberRepo.readAll(sr, this.scope(sr))
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.Subscriber> {
        const subscriber = await this.subscriberRepo.readById(id, this.scope(sr))
        if (!subscriber)
            throw new NotFoundException(this.i18n.t('errors.SUBSCRIBER_NOT_FOUND'))
        return subscriber
    }

    /**
     * Subscribers the caller may see: all for system, admin and ccareadmin, the own reseller's for reseller and
     * ccare, the own customer's for subscriberadmin, itself for subscriber
     */
    private scope(sr: ServiceRequest): SubscriberScope {
        switch (sr.user.role) {
            case RbacRole.system:
            case RbacRole.admin:
            case RbacRole.ccareadmin:
                return {}
            case RbacRole.reseller:
            case RbacRole.ccare:
                return {resellerId: sr.user.reseller_id}
            case RbacRole.subscriberadmin:
                return {customerId: sr.user.customer_id}
            case RbacRole.subscriber:
                return {subscriberId: sr.user.id}
        }
        throw new ForbiddenException(this.i18n.t('errors.PERMISSION_DENIED'))
    }
}
