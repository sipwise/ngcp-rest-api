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

        const lines = (data[0] as string).split(/}\s*{/)

        const entries: {[key: string]: internal.BanRegistration} = {}

        let filterByKey: string

        await asyncLib.forEach(lines, async (line) => {
            let entryId: number
            let encodedKey: string
            let username: string
            let domain: string
            let authCount: number
            let lastAuth: number

            const entryMatch = line.match(/(entry):\s+(\d+)/)

            const userDomMatchCount = line.match(/name:\s+([^\s@]+)@([^:]+)::auth_count/)
            if (userDomMatchCount) {
                if (entryMatch) {
                    entryId = +entryMatch.at(2)
                }

                username = userDomMatchCount.at(1)
                domain = userDomMatchCount.at(2)
                encodedKey = btoa(`${username}@${domain}`)

                if (id && entryId == id) {
                    filterByKey = encodedKey
                }

                if (!entries[encodedKey]) {
                    entries[encodedKey] = {
                        id: entryId,
                        username: username,
                        domain: domain,
                        authCount: 0,
                        lastAuth: new Date(0),
                    }
                } else {
                    entries[encodedKey].id = entryId
                }
            }

            const userDomMatchLast = line.match(/name:\s+([^\s@]+)@([^:]+)::last_auth/)
            if (userDomMatchLast) {
                username = userDomMatchLast.at(1)
                domain = userDomMatchLast.at(2)
                encodedKey = btoa(`${username}@${domain}`)

                if (!entries[encodedKey]) {
                    entries[encodedKey] = {
                        id: 0,
                        username: username,
                        domain: domain,
                        authCount: 0,
                        lastAuth: new Date(0),
                    }
                }
            }

            if (id && filterByKey != encodedKey) {
                return
            }

            if (entryId && domain && username) {
                if (filter?.username && username !== filter.username) {
                    return
                }

                if (filter?.domain && domain !== filter.domain) {
                    return
                }

            }

            const valueMatch = line.match(/value:\s+([^\s]+)/)
            if (encodedKey && valueMatch && userDomMatchCount) {
                authCount = +valueMatch.at(1)
                entries[encodedKey].authCount = authCount
            }
            if (encodedKey && valueMatch && userDomMatchLast) {
                lastAuth = +valueMatch.at(1)
                entries[encodedKey].lastAuth = new Date(lastAuth * 1000)
            }
        })

        const parsedEntries: internal.BanRegistration[] = []

        await Promise.all(Object.values(entries).map(async (entry) => {
            if (entry.username && entry.domain && entry.authCount && entry.lastAuth)
                parsedEntries.push(entry)
        }))

        return parsedEntries.sort((a, b) => (a.id < b.id ? -1 : 1))
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
