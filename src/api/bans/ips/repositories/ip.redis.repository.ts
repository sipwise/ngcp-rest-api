import {Inject, Injectable} from '@nestjs/common'
import {v5 as uuidv5} from 'uuid'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {isWildcardString, wildcardStringToRegexp} from '~/helpers/search-wildcard-string'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {LoggerService} from '~/logger/logger.service'

interface FilterBy {
    ip: string
    id?: string
}

const uuidNS = '52f79f45-0186-4832-b530-9afff16d85d8'

@Injectable()
export class BanIpRedisRepository {
    private readonly log = new LoggerService(BanIpRedisRepository.name)
    constructor(
        private readonly app: AppService,
        @Inject (TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async readBannedIps(id?: string, filter?: FilterBy): Promise<internal.BanIp[]> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-ban-ips-dump',
            task: 'kam_lb_security_ban_dump',
            dst: '*|state=active;role=proxy',
            data: JSON.stringify({extra_args: 'ipban'}),
        })
        const data = await this.taskAgentHelper.invokeTask<internal.BanIp>(
            publishChannel,
            feedbackChannel,
            request)

        if (!data)
            return []

        const lines =
            data && Array.isArray(data)
                ? data.map(c => (c as string).split(/}\s*{/)).flat()
                : []

        const entries: {[key: string]: internal.BanIp} = {}

        for (const line of lines) {
            let entryId: string
            let ip: string

            const ipMatch = line.match(/name:\s+([^\s]+)/)
            if (ipMatch) {
                ip = ipMatch[1]
                entryId = uuidv5(ip, uuidNS)

                if (id && entryId != id) {
                    continue
                }

                if (filter?.ip) {
                    const rx =
                        isWildcardString(filter.ip)
                            ? wildcardStringToRegexp(filter.ip)
                            : undefined
                    if (rx && !rx.test(ip))
                        continue
                    if (!rx && ip != filter.ip)
                        continue
                }

                if (filter?.id) {
                    const ids = filter.id.split(',').map(v => v.trim())
                    if (!ids.includes(entryId))
                        continue
                }

                if (!entries[entryId]) {
                    entries[entryId] = {
                        id: entryId,
                        ip: ip,
                    }
                }
            }
        }

        return Object.values(entries).filter(entry => entry.ip)
    }

    async deleteBannedIp(id: string): Promise<void> {
        const bannedIps = await this.readBannedIps(id)

        const entry = bannedIps.find(e => e.id == id)
        if (!entry)
            return

        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-ban-ip-delete',
            task: 'kam_lb_security_ban_delete',
            dst: '*|state=active;role=proxy',
            data: JSON.stringify({extra_args: `ipban ${entry.ip}`}),
        })

        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }
}
