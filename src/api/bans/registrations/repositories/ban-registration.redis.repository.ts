import {Inject, Injectable} from '@nestjs/common'
import * as asyncLib from 'async'
import {v5 as uuidv5} from 'uuid'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {isWildcardString, wildcardStringToRegexp} from '~/helpers/search-wildcard-string'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {LoggerService} from '~/logger/logger.service'

interface FilterBy {
    username: string
    domain: string
}

const uuidNS = '52f79f45-0186-4832-b530-9afff16d85d7'

@Injectable()
export class BanRegistrationRedisRepository {
    private readonly log = new LoggerService(BanRegistrationRedisRepository.name)

    constructor(
        private readonly app: AppService,
        @Inject(TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async readBannedRegistrations(id?: string, filter?: FilterBy): Promise<internal.BanRegistration[]> {
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

        let userDomMatchCount: RegExpMatchArray | null
        let userDomMatchLast: RegExpMatchArray | null

        await asyncLib.forEach(lines, async (line) => {
            let entryId: string
            let username: string
            let domain: string
            let authCount: number
            let lastAuth: number

            userDomMatchCount = line.match(/name:\s+([^\s@]+)@([^:]+)::auth_count/)
            if (userDomMatchCount) {
                username = userDomMatchCount.at(1)
                domain = userDomMatchCount.at(2)
                entryId = uuidv5(`${username}:${domain}`, uuidNS)

                if (id && entryId != id) {
                    return
                }

                if (filter?.username) {
                    const rx =
                        isWildcardString(filter.username)
                            ? wildcardStringToRegexp(filter.username)
                            : undefined
                    if (rx && !rx.test(username))
                        return
                    if (!rx && username != filter.username)
                        return
                }

                if (filter?.domain) {
                    const rx =
                        isWildcardString(filter.domain)
                            ? wildcardStringToRegexp(filter.domain)
                            : undefined
                    if (rx && !rx.test(domain))
                        return
                    if (!rx && domain != filter.domain)
                        return
                }

                if (!entries[entryId]) {
                    entries[entryId] = {
                        id: entryId,
                        username: username,
                        domain: domain,
                        authCount: 0,
                        lastAuth: new Date(0),
                    }
                }
            }

            userDomMatchLast = line.match(/name:\s+([^\s@]+)@([^:]+)::last_auth/)
            if (userDomMatchLast) {
                username = userDomMatchLast.at(1)
                domain = userDomMatchLast.at(2)
                entryId = uuidv5(`${username}:${domain}`, uuidNS)

                if (id && entryId != id) {
                    return
                }

                if (filter?.username) {
                    const rx =
                        isWildcardString(filter.username)
                            ? wildcardStringToRegexp(filter.username)
                            : undefined
                    if (rx && !rx.test(username))
                        return
                    if (!rx && username != filter.username)
                        return
                }

                if (filter?.domain) {
                    const rx =
                        isWildcardString(filter.domain)
                            ? wildcardStringToRegexp(filter.domain)
                            : undefined
                    if (rx && !rx.test(domain))
                        return
                    if (!rx && domain != filter.domain)
                        return
                }

                if (!entries[entryId]) {
                    entries[entryId] = {
                        id: entryId,
                        username: username,
                        domain: domain,
                        authCount: 0,
                        lastAuth: new Date(0),
                    }
                }
            }

            const valueMatch = line.match(/value:\s+([^\s]+)/)
            if (valueMatch && userDomMatchCount) {
                username = userDomMatchCount.at(1)
                domain = userDomMatchCount.at(2)
                entryId = uuidv5(`${username}:${domain}`, uuidNS)
                authCount = +valueMatch.at(1)

                if (!entries[entryId]) {
                    entries[entryId] = {
                        id: entryId,
                        username: username,
                        domain: domain,
                        authCount: authCount,
                        lastAuth: new Date(0),
                    }
                } else {
                    entries[entryId].authCount = authCount
                }
            } else if (valueMatch && userDomMatchLast) {
                username = userDomMatchLast.at(1)
                domain = userDomMatchLast.at(2)
                entryId = uuidv5(`${username}:${domain}`, uuidNS)
                lastAuth = +valueMatch.at(1)

                if (!entries[entryId]) {
                    entries[entryId] = {
                        id: entryId,
                        username: username,
                        domain: domain,
                        authCount: +valueMatch.at(1),
                        lastAuth: new Date(lastAuth * 1000),
                    }
                } else {
                    entries[entryId].lastAuth = new Date(lastAuth * 1000)
                }
            }
        })

        const parsedEntries: internal.BanRegistration[] = []

        await Promise.all(Object.values(entries).map(async (entry) => {
            if (entry.username && entry.domain && entry.authCount && entry.lastAuth)
                parsedEntries.push(entry)
        }))

        return parsedEntries
    }

    async deleteBannedRegistration(id: string): Promise<void> {
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

