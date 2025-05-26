import * as os from 'os'
import {setInterval} from 'timers/promises'

import {Inject, Injectable, InternalServerErrorException, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {v4 as uuidv4} from 'uuid'

import {FilterBy, RewriteRuleMariadbRepository} from './repositories/rewrite-rule.mariadb.repository'
import {RewriteRuleRedisRepository} from './repositories/rewrite-rule.redis.repository'

import {RewriteRuleSetMariadbRepository} from '~/api/rewrite-rules/sets/repositories/rewrite-rule-set.mariadb.repository'
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
export class RewriteRuleService implements CrudService<internal.RewriteRule> {
    private readonly log = new LoggerService(RewriteRuleService.name)

    constructor(
        @Inject(I18nService) private readonly i18n: I18nService,
        @Inject(RewriteRuleMariadbRepository) private readonly ruleRepo: RewriteRuleMariadbRepository,
        @Inject(RewriteRuleSetMariadbRepository) private readonly ruleSetRepo: RewriteRuleSetMariadbRepository,
        @Inject(RewriteRuleRedisRepository) private readonly ruleRedisRepo: RewriteRuleRedisRepository,
    ) {
    }

    async create(entities: internal.RewriteRule[], sr: ServiceRequest): Promise<internal.RewriteRule[]> {
        if (sr.user.reseller_id_required) {
            const sets = await this.ruleSetRepo.readWhereInIds(entities.map(entity => entity.setId), sr)
            if (sets.some(set => set.resellerId != sr.user.reseller_id)) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                throw new UnprocessableEntityException(error.message)
            }
        }

        // TODO: Can this be done in a single query?
        const maxPriorities = []
        for (const entity of entities) {
            if (!entity.priority) {
                if (!maxPriorities[entity.setId]) {
                    maxPriorities[entity.setId] = await this.ruleRepo.readMaxPriorityInSet(entity.setId, sr)
                }
                entity.priority = maxPriorities[entity.setId] + 1
            }
        }

        const createdIds = await this.ruleRepo.create(entities)

        await this.reloadDialPlan(sr)

        return await this.ruleRepo.readWhereInIds(createdIds, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.RewriteRule[], number]> {
        const filters: FilterBy = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.RewriteRule> {
        const filters = this.getFiltersFromServiceRequest(sr)
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.RewriteRule>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let rules: internal.RewriteRule[]
        if (sr.user.reseller_id_required) {
            rules = await this.ruleRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            rules = await this.ruleRepo.readWhereInIds(ids, sr)
        }

        if (rules.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != rules.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const updatedIds = await this.ruleRepo.update(updates, sr)

        await this.reloadDialPlan(sr)

        return updatedIds
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let rules: internal.RewriteRule[]
        if (sr.user.reseller_id_required) {
            rules = await this.ruleRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            rules = await this.ruleRepo.readWhereInIds(ids, sr)
        }

        if (rules.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != rules.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const deletedIds = await this.ruleRepo.delete(ids,sr)

        await this.reloadDialPlan(sr)

        return deletedIds
    }

    private getFiltersFromServiceRequest(sr: ServiceRequest): FilterBy {
        const filterBy: FilterBy = {}
        if (sr.params && sr.params['setId']) {
            filterBy.setId = +sr.params['setId']
        }
        return filterBy
    }
    private async reloadDialPlan(_sr: ServiceRequest): Promise<void> {
        const publishChannel = 'ngcp-task-agent-redis'
        const feedbackChannel = 'ngcp-rest-api-dialplan-reload-' + uuidv4()

        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task: 'kam_proxy_dialplan_reload',
            src: os.hostname(),
            dst: '*|role=proxy',
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

        await this.ruleRedisRepo.subscribeToFeedback(
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
        await this.ruleRedisRepo.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.ruleRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail fast if no response within initialTimeout
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.ruleRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail if total timeout exceeded
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.ruleRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.ruleRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
    }
}
