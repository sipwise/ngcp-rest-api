import {Inject, Injectable, InternalServerErrorException} from '@nestjs/common'

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
            data: id ? JSON.stringify({extra_args: `ipban ${id}`}) : JSON.stringify({extra_args: 'ipban'}),
        })
        const bannedIps = await this.taskAgentHelper.invokeTask<internal.BanIp>(
            publishChannel,
            feedbackChannel,
            request,
            async (d, result) => {
                for (const entry of Array.isArray(d) ? d : [d]) {
                    if (entry.size > 1) {
                        throw new InternalServerErrorException(`Unexpected entry size: ${entry.size}`)
                    }
                    if (filter?.ip && entry.slot.name !== filter.ip) {
                        continue
                    }
                    result.push({
                        id: entry.entry,
                        ip: entry.slot.name,
                    } as internal.BanIp)
                }
            },
        ) as internal.BanIp[]
        return bannedIps
    }

    async deleteBannedIp(id: number): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-ban-ip-delete',
            task: 'kam_lb_security_ban_delete',
            dst: '*|state=active;role=proxy',
            data: {extra_args: `ipban ${id}`},
        })

        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }
}
