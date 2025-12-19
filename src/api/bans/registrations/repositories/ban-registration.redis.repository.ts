import {Inject, Injectable} from '@nestjs/common'
import * as asyncLib from 'async'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {LoggerService} from '~/logger/logger.service'

interface FilterBy {
    username: string
    domain: string
}

@Injectable()
export class BanRegistrationRedisRepository {
    private readonly log = new LoggerService(BanRegistrationRedisRepository.name)

    constructor(
        private readonly app: AppService,
        @Inject(TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async readBannedRegistrations(id?: number, filter?: FilterBy): Promise<internal.BanRegistration[]> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-ban-user-dump',
            task: 'kam_lb_security_ban_dump',
            dst: '*|state=active;role=proxy',
            data: JSON.stringify({extra_args: 'auth'}),
        })
        const data = await this.taskAgentHelper.invokeTask<internal.BanRegistration>(
            publishChannel,
            feedbackChannel,
            request,
        )

        const lines = (data[0] as string).split('},{')

        const bannedRegs: internal.BanRegistration[] = []

        asyncLib.forEach(lines, async (line) => {
            let entryId: number
            let username: string
            let domain: string

            const entryMatch = line.match(/(entry):\s+(\d+)/)
            if (entryMatch) {
                entryId = +entryMatch.at(2)
            }

            if (id && entryId != id) {
                return
            }

            const userDomMatch = line.match(/name:\s+([^\s@]+)@([^:]+)::auth_count/)
            if (userDomMatch) {
                username = userDomMatch.at(1)
                domain = userDomMatch.at(2)
            }

            if (entryId && domain && username) {
                if (filter?.username && username !== filter.username) {
                    return
                }

                if (filter?.domain && domain !== filter.domain) {
                    return
                }

                bannedRegs.push({
                    id: entryId,
                    username: username,
                    domain: domain,
                })
            }
        })

        return bannedRegs
    }

    async deleteBannedRegistration(id: number): Promise<void> {
        const bannedRegs = await this.readBannedRegistrations(id)

        asyncLib.some(bannedRegs, async entry => {
            if (entry.id != id) {
                return false
            }

            const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
                feedbackChannel: 'ngcp-rest-api-ban-regs-delete',
                task: 'kam_lb_security_ban_delete',
                dst: '*|state=active;role=proxy',
                data: JSON.stringify({extra_args: `auth ${entry.username}@${entry.domain}::auth_count`}),
            })

            await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)

            return true
        })
    }
}
