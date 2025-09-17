import * as os from 'os'
import {setInterval} from 'timers/promises'

import {Inject, Injectable, InternalServerErrorException, NotFoundException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {v4 as uuidv4} from 'uuid'

import {BanRegistrationRedisRepository} from './repositories/ban-registration.redis.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {ErrorMessage} from '~/interfaces/error-message.interface'
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

    async readAll(_sr: ServiceRequest): Promise<internal.BanRegistration[]> {
        return await this.readBannedUsers()
    }

    async read(id: number, _sr: ServiceRequest): Promise<internal.BanRegistration> {
        const bannedUsers = await this.readBannedUsers(id)
        if (!bannedUsers.length)
            throw new NotFoundException()

        return bannedUsers[0]
    }

    async delete(ids: number[], _sr: ServiceRequest): Promise<number[]> {
        for (const id of ids)
            await this.deleteUserBan(id)
        return ids
    }

    private async readBannedUsers(entry?: number): Promise<internal.BanRegistration[]> {
        const publishChannel = 'ngcp-task-agent-redis'
        const feedbackChannel = 'ngcp-rest-api-ban-auth-dump-' + uuidv4()

        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task: 'kam_lb_security_ban_dump',
            src: os.hostname(),
            dst: '*|state=active;role=proxy',
            options: {feedback_channel: feedbackChannel},
            data: entry ? {extra_args: `auth ${entry}`} : {extra_args: 'auth'},
        }

        const agentStatus = new Map<string, string>()
        const bannedUsers: internal.BanRegistration[] = []
        const startTime = Date.now()
        const initialTimeout = 2000 // 2 seconds for first response
        const maxTimeout = 5000     // 5 seconds total
        const onDoneWaitTimeout = 500 // 0.5 seconds after all done

        let onDoneSince: number | null = null
        let hasError = false
        let errorReason = ''
        let firstResponseReceived = false

        // Subscribe to feedback from task agents
        await this.repository.subscribeToFeedback(
            feedbackChannel,
            async (feedbackResponse: TaskAgentResponse): Promise<void> => {
                this.log.debug(`got task agent response: ${JSON.stringify(feedbackResponse)}`)
                const {src: host, status, reason} = feedbackResponse
                agentStatus.set(host, status)

                if (!firstResponseReceived) firstResponseReceived = true

                if (status === 'error') {
                    hasError = true
                    errorReason = reason ?? 'Unknown error'
                }

                if (status === 'done' && feedbackResponse.data != undefined) {
                    const data = feedbackResponse.data.length > 0 ? JSON.parse(feedbackResponse.data as string) : []
                    for (const d of data) {
                        if (!(d.name.slot.name as string).includes('::auth_count')) {
                            continue
                        }
                        if (d.size > 1) {
                            throw new InternalServerErrorException(`Unexpected entry size: ${d.size}`)
                        }
                        if (d.slot.value <= this.app.config.security.kamailio.lb.failed_auth_attempts) {
                            continue
                        }
                        const key = (d.name.slot.name as string).split('::auth_count')[0].split('@')
                        const username = key[0]
                        const domain = key[1]
                        bannedUsers.push({
                            id: d.entry,
                            username: username,
                            domain: domain,
                        })
                    }
                }
            },
        )

        // Publish the task agent request
        this.log.debug(`publish to task agent '${publishChannel}': ${JSON.stringify(request)}`)
        await this.repository.publishToTaskAgent(publishChannel, request)

        // Wait for agents to complete or timeout
        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.repository.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            if (!firstResponseReceived && now - startTime > initialTimeout) {
                await this.repository.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            if (firstResponseReceived && now - startTime > maxTimeout) {
                await this.repository.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if (now - onDoneSince > onDoneWaitTimeout) {
                    await this.repository.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
        return bannedUsers
    }

    private async deleteUserBan(entry: number): Promise<void> {
        const publishChannel = 'ngcp-task-agent-redis'
        const feedbackChannel = 'ngcp-rest-api-ban-auth-delete-' + uuidv4()
        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task: 'kam_lb_security_ban_delete',
            src: os.hostname(),
            dst: '*|state=active;role=proxy',
            options: {feedback_channel: feedbackChannel},
            data: {extra_args: `auth ${entry}`},
        }

        const agentStatus = new Map<string, string>()
        const startTime = Date.now()
        const initialTimeout = 2000    // 2 seconds for initial accepted response
        const maxTimeout = 5000        // max 5 seconds total wait time
        const onDoneWaitTimeout = 500  // wait 0.5 seconds after all done for consistency

        let onDoneSince: number | null = null
        let hasError = false
        let errorReason = ''
        let firstResponseReceived = false

        await this.repository.subscribeToFeedback(
            feedbackChannel,
            async (feedbackResponse: TaskAgentResponse): Promise<void> => {
                this.log.debug(`got task agent response: ${JSON.stringify(feedbackResponse)}`)
                const {src: host, status, reason} = feedbackResponse

                agentStatus.set(host, status)

                if (!firstResponseReceived) {
                    firstResponseReceived = true
                }

                if (status === 'error') {
                    hasError = true
                    errorReason = reason ?? 'Unknown error'
                }
            },
        )

        this.log.debug(`publish to task agent '${publishChannel}': ${JSON.stringify(request)}`)
        await this.repository.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.repository.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail fast if no response within initialTimeout
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.repository.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail if total timeout exceeded
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.repository.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.repository.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
    }
}
