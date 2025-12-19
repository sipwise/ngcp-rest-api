import {Inject, Injectable} from '@nestjs/common'
import * as asyncLib from 'async'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {LoggerService} from '~/logger/logger.service'

interface FilterBy {
    ip: string
}

@Injectable()
export class BanIpRedisRepository {
    private readonly log = new LoggerService(BanIpRedisRepository.name)
    constructor(
        private readonly app: AppService,
        @Inject (TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async readBannedIps(id?: number, filter?: FilterBy): Promise<internal.BanIp[]> {
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

        const lines = (data[0] as string).split('},{')

        const bannedIps: internal.BanIp[] = []

        asyncLib.forEach(lines, async (line) => {
            let entryId: number
            let ip: string

            const entryMatch = line.match(/(entry):\s+(\d+)/)
            if (entryMatch) {
                entryId = +entryMatch.at(2)
            }

            if (id && entryId != id) {
                return
            }

            const ipMatch = line.match(/name:\s+([^\s]+)/)
            if (ipMatch) {
                ip = ipMatch.at(1)
            }

            if (entryId && ip) {
                if (filter?.ip && ip !== filter.ip) {
                    return
                }

                bannedIps.push({
                    id: entryId,
                    ip: ip,
                })
            }
        })

        return bannedIps
    }

    async deleteBannedIp(id: number): Promise<void> {
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
