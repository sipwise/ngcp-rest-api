
import * as os from 'os'
import {setInterval} from 'timers/promises'

import {Inject, Injectable, InternalServerErrorException, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {In} from 'typeorm'
import {runOnTransactionCommit} from 'typeorm-transactional'
import {v4 as uuidv4} from 'uuid'

import {PeeringGroupMariadbRepository} from './repositories/peering-group.mariadb.repository'
import {PeeringGroupRedisRepository} from './repositories/peering-group.redis.repository'

import {db, internal} from '~/entities'
import {ProductClass} from '~/entities/internal/product.internal.entity'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {GenerateErrorMessageArray} from '~/helpers/http-error.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class PeeringGroupService implements CrudService<internal.VoipPeeringGroup> {
    private readonly log = new LoggerService(PeeringGroupService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (PeeringGroupMariadbRepository) private readonly peeringGroupRepo: PeeringGroupMariadbRepository,
        @Inject (PeeringGroupRedisRepository) private readonly peeringGroupRedisRepo: PeeringGroupRedisRepository,
    ) {
    }

    async create(entities: internal.VoipPeeringGroup[], sr: ServiceRequest): Promise<internal.VoipPeeringGroup[]> {
        const contractIds = entities.map(e => e.peeringContractId)
        const contracts = await db.billing.Contract.find({
            where: {
                id: In(contractIds),
                product: {class: In([
                    ProductClass.PstnPeering,
                    ProductClass.SipPeering,
                ])},
            },
        })
        const validIds = new Set(contracts.map(c => c.id))
        const missing = entities.filter(e => !validIds.has(e.peeringContractId))
        if (missing.length > 0) {
            throw new NotFoundException()
        }
        const created = await this.peeringGroupRepo.create(entities)
        return this.peeringGroupRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.VoipPeeringGroup[], number]> {
        return await this.peeringGroupRepo.readAll(sr)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.VoipPeeringGroup> {
        return await this.peeringGroupRepo.readById(id, sr)
    }

    async update(updates: Dictionary<internal.VoipPeeringGroup>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))
        const groups = await this.peeringGroupRepo.readWhereInIds(ids, sr)

        if (groups.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != groups.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        // check if contract exists
        const contractIds = groups.map(g => g.peeringContractId)
        const contracts = await db.billing.Contract.find({
            where: {
                id: In(contractIds),
                product: {class: In([
                    ProductClass.PstnPeering,
                    ProductClass.SipPeering,
                ])},
            },
        })
        const validIds = new Set(contracts.map(c => c.id))
        const missing = groups.filter(g => !validIds.has(g.peeringContractId))
        if (missing.length > 0) {
            throw new NotFoundException()
        }

        return await this.peeringGroupRepo.update(updates, sr)
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        const groups = await this.peeringGroupRepo.readWhereInIds(ids, sr)
        if (groups.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != groups.length) {
            const error: ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const reloadKamailioRequired = await this.peeringGroupRepo.hasEnabledOrProbedServerInGroups(ids, sr)
        if (reloadKamailioRequired) {
            await this.reloadKamProxyAfterCommit(sr)
        }

        return await this.peeringGroupRepo.delete(ids, sr)
    }

    async reloadKamProxyAfterCommit(sr: ServiceRequest): Promise<void> {
        runOnTransactionCommit(async () => {
            await this.reloadKamProxLcr(sr)
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

        await this.peeringGroupRedisRepo.subscribeToFeedback(
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
        await this.peeringGroupRedisRepo.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail fast if no response within initialTimeout
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail if total timeout exceeded
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
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

        await this.peeringGroupRedisRepo.subscribeToFeedback(
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
        await this.peeringGroupRedisRepo.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail fast if no response within initialTimeout
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail if total timeout exceeded
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.peeringGroupRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
    }

}
