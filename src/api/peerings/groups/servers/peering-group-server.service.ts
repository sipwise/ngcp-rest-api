
import * as os from 'os'
import {setInterval} from 'timers/promises'

import {Inject, Injectable, InternalServerErrorException, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {runOnTransactionCommit} from 'typeorm-transactional'
import {v4 as uuidv4} from 'uuid'

import {FilterBy, PeeringGroupServerMariadbRepository} from './repositories/peering-group-server.mariadb.repository'
import {PeeringGroupServerRedisRepository} from './repositories/peering-group-server.redis.repository'

import {internal} from '~/entities'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PeeringGroupServerService implements CrudService<internal.VoipPeeringServer> {
    private readonly log = new LoggerService(PeeringGroupServerService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (PeeringGroupServerMariadbRepository) private readonly peeringGroupServerRepo: PeeringGroupServerMariadbRepository,
        @Inject(PeeringGroupServerRedisRepository) private readonly serverRedisRepo: PeeringGroupServerRedisRepository,
    ) {
    }

    async create(entities: internal.VoipPeeringServer[], sr: ServiceRequest): Promise<internal.VoipPeeringServer[]> {
        const created = await this.peeringGroupServerRepo.create(entities)
        await this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(entities)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }
        return this.peeringGroupServerRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringServer[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.peeringGroupServerRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringServer> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        return await this.peeringGroupServerRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.VoipPeeringServer>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const servers = await this.peeringGroupServerRepo.readWhereInIds(ids, sr)

        if (servers.length == 0) {
            throw new NotFoundException()
        }

        if (ids.length != servers.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        // Always reload LCR
        await this.reloadKamProxyLcrAfterCommit(sr)

        if (this.requiresDispatcherReloadOnUpdate(servers, updates)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }

        return this.peeringGroupServerRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const servers = await this.peeringGroupServerRepo.readWhereInIds(ids, sr)
        if (servers.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != servers.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        await this.reloadKamProxyLcrAfterCommit(sr)
        if (this.requiresDispatcherReload(servers)) {
            await this.reloadKamProxyDispatcherAfterCommit(sr)
        }
        return await this.peeringGroupServerRepo.delete(ids, sr)
    }

    async reloadKamProxyLcrAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.reloadKamProxLcr(sr)
        })
    }

    async reloadKamProxyDispatcherAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.reloadKamProxDispatcher(sr)
        })
    }

    private async reloadKamProxLcr(_sr: ServiceRequest): Promise<void> {
        const publishChannel = 'ngcp-task-agent-redis'
        const feedbackChannel = 'ngcp-rest-api-lcr-reload-' + uuidv4()

        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task: 'kam_proxy_lcr_reload',
            src: os.hostname(),
            dst: '*|state=active;role=proxy',
            options: {
                feedback_channel: feedbackChannel,
            },
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

        await this.serverRedisRepo.subscribeToFeedback(
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
        await this.serverRedisRepo.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail fast if no response within initialTimeout
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail if total timeout exceeded
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
    }

    private async reloadKamProxDispatcher(_sr: ServiceRequest): Promise<void> {
        const publishChannel = 'ngcp-task-agent-redis'
        const feedbackChannel = 'ngcp-rest-api-dispatcher-reload-' + uuidv4()

        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task: 'kam_proxy_dispatcher_reload',
            src: os.hostname(),
            dst: '*|state=active;role=proxy',
            options: {
                feedback_channel: feedbackChannel,
            },
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

        await this.serverRedisRepo.subscribeToFeedback(
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
        await this.serverRedisRepo.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail fast if no response within initialTimeout
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail if total timeout exceeded
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.serverRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
    }

    private requiresDispatcherReloadOnUpdate(oldServers: internal.VoipPeeringServer[], updates: Dictionary<internal.VoipPeeringServer>): boolean {
        return oldServers.some(server => {
            const updated = updates[server.id]
            if (!updated) return false
            return server.enabled !== updated.enabled || server.probe !== updated.probe
        })
    }

    private requiresDispatcherReload(servers: internal.VoipPeeringServer[]): boolean {
        return servers.some(server => server.enabled && server.probe)
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['groupId']) {
            filterBy.group_id = +sr.params['groupId']
        }
        return filterBy
    }
}
