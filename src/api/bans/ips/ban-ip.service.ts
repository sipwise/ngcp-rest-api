
import {Inject, Injectable, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'

import {BanIpRedisRepository} from './repositories/ban-ip.redis.repository'

import {BanIpSearchDto} from '~/api/bans/ips/dto/ban-ips-search'
import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {paginate} from '~/helpers/paginate.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class BanIpService {
    private readonly log = new LoggerService(BanIpService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(BanIpRedisRepository) private readonly repository: BanIpRedisRepository,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<internal.BanIp[]> {
        const search = new BanIpSearchDto()
        if (sr.query?.ip && typeof sr.query?.ip === 'string') {
            search.ip = sr.query.ip
        }

        const result = await this.repository.readBannedIps(undefined, search)

        const page: string = (sr.req.query?.page as string) ?? `${AppService.config.common.api_default_query_page}`
        const rows: string = (sr.req.query?.rows as string) ?? `${AppService.config.common.api_default_query_rows}`

        return paginate<internal.BanIp>(result, +rows, +page)
    }

    async read(id: number, _sr: ServiceRequest): Promise<internal.BanIp> {
        const bannedIps = await this.repository.readBannedIps(id)
        if (!bannedIps.length)
            throw new NotFoundException()

        return bannedIps[0]
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids)
            await this.repository.deleteBannedIp(id)
        return ids
    }
}
