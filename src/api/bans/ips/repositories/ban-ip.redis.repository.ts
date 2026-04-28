import {Inject, Injectable} from '@nestjs/common'
import * as asyncLib from 'async'
import {v5 as uuidv5} from 'uuid'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {isWildcardString, wildcardStringToRegexp} from '~/helpers/search-wildcard-string'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {LoggerService} from '~/logger/logger.service'

interface FilterBy {
    ip: string
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

        const lines = (data[0] as string).split(/}\s*{/)

        const entries: {[key: string]: internal.BanIp} = {}

        let ipMatch: RegExpMatchArray | null

        await asyncLib.forEach(lines, async (line) => {
            let entryId: string
            let ip: string

            ipMatch = line.match(/name:\s+([^\s]+)/)
            if (ipMatch) {
                ip = ipMatch.at(1)
                entryId = uuidv5(ip, uuidNS)

                if (id && entryId != id) {
                    return
                }

                if (filter?.ip) {
                    const rx =
                        isWildcardString(filter.ip)
                            ? wildcardStringToRegexp(filter.ip)
                            : undefined
                    if (rx && !rx.test(ip))
                        return
                    if (!rx && ip != filter.ip)
                        return
                }

                if (!entries[entryId]) {
                    entries[entryId] = {
                        id: entryId,
                        ip: ip,
                    }
                }
            }
        })

        const parsedEntries: internal.BanIp[] = []

        await Promise.all(Object.values(entries).map(async (entry) => {
            if (entry.ip)
                parsedEntries.push(entry)
        }))

        return parsedEntries
    }

    async deleteBannedIp(id: string): Promise<void> {
        const bannedIps = await this.readBannedIps(id)

        asyncLib.some(bannedIps, async (entry) => {
            if (entry.id != id) {
                return false
            }

            const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
                feedbackChannel: 'ngcp-rest-api-ban-ip-delete',
                task: 'kam_lb_security_ban_delete',
                dst: '*|state=active;role=proxy',
                data: JSON.stringify({extra_args: `ipban ${entry.ip}`}),
            })

            await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)

            return true
        })
    }
}
