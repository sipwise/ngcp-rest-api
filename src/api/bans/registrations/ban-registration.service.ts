import {Inject, Injectable,NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {BanRegistrationRedisRepository} from './repositories/ban-registration.redis.repository'

import {BanRegistrationSearchDto} from '~/api/bans/registrations/dto/ban-registration-search'
import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class BanRegistrationService {
    private readonly log = new LoggerService(BanRegistrationService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(BanRegistrationRedisRepository) private readonly repository: BanRegistrationRedisRepository,
        @Inject(AppService) private readonly app: AppService,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<internal.BanRegistration[]> {
        const search = new BanRegistrationSearchDto()
        if (sr.query?.username && typeof sr.query?.username === 'string') {
            search.username = sr.query.username
        }
        if (sr.query?.domain && typeof sr.query?.domain === 'string') {
            search.domain = sr.query.domain
        }

        return await this.repository.readBannedRegistrations(undefined, search)
    }

    async read(id: number, _sr: ServiceRequest): Promise<internal.BanRegistration> {
        const bannedUsers = await this.repository.readBannedRegistrations(id)
        if (!bannedUsers.length)
            throw new NotFoundException()

        return bannedUsers[0]
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids)
            await this.repository.deleteBannedRegistration(id)
        return ids
    }
}
