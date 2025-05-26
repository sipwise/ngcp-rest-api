import * as os from 'os'
import {setInterval} from 'timers/promises'

import {Inject, Injectable, InternalServerErrorException, NotFoundException, UnprocessableEntityException} from '@nestjs/common'
import {GenerateErrorMessageArray} from 'helpers/http-error.helper'
import {I18nService} from 'nestjs-i18n'
import {v4 as uuidv4} from 'uuid'

import {FilterBy, RewriteRuleSetMariadbRepository} from './repositories/rewrite-rule-set.mariadb.repository'
import {RewriteRuleSetRedisRepository} from './repositories/rewrite-rule-set.redis.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {Dictionary} from '~/helpers/dictionary.helper'
import {CrudService} from '~/interfaces/crud-service.interface'
import {ErrorMessage} from '~/interfaces/error-message.interface'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class RewriteRuleSetService implements CrudService<internal.RewriteRuleSet> {
    private readonly log = new LoggerService(RewriteRuleSetService.name)

    constructor(
        @Inject (I18nService) private readonly i18n: I18nService,
        @Inject (RewriteRuleSetMariadbRepository) private readonly ruleSetRepo: RewriteRuleSetMariadbRepository,
        @Inject (AppService) private readonly app: AppService,
        @Inject (RewriteRuleSetRedisRepository) private readonly ruleSetRedisRepo: RewriteRuleSetRedisRepository,
    ) {
    }

    async create(entities: internal.RewriteRuleSet[], sr: ServiceRequest): Promise<internal.RewriteRuleSet[]> {
        await Promise.all(entities.map(async entity => {
            if (!entity.resellerId)
                entity.resellerId = sr.user.reseller_id

            if (sr.user.reseller_id_required)
                await this.checkPermissions(entity.resellerId, sr)
        }))
        const created = await this.ruleSetRepo.create(entities)

        return await this.ruleSetRepo.readWhereInIds(created, sr)
    }

    async readAll(sr: ServiceRequest): Promise<[internal.RewriteRuleSet[], number]> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleSetRepo.readAll(sr, filters)
    }

    async read(id: number, sr: ServiceRequest): Promise<internal.RewriteRuleSet> {
        const filters: FilterBy = {}
        if (sr.user.reseller_id_required)
            filters.resellerId = sr.user.reseller_id

        return await this.ruleSetRepo.readById(id, sr, filters)
    }

    async update(updates: Dictionary<internal.RewriteRuleSet>, sr: ServiceRequest): Promise<number[]> {
        const ids = Object.keys(updates).map(id => parseInt(id))

        let sets: internal.RewriteRuleSet[]
        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        if (sets.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != sets.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        return await this.ruleSetRepo.update(updates, sr)
    }

    async updateWithRuleRecreation(updates: Dictionary<internal.RewriteRuleSet>, rules: internal.RewriteRule[], sr: ServiceRequest): Promise<number[]> {
        const tx = await this.app.dbConnection().transaction(async manager => {
            const ids = Object.keys(updates).map(id => parseInt(id))
            let sets: internal.RewriteRuleSet[]
            if (sr.user.reseller_id_required) {
                sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
            } else {
                sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
            }

            if (sets.length == 0) {
                throw new NotFoundException()
            } else if (ids.length != sets.length) {
                const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
                const message = GenerateErrorMessageArray(ids, error.message)
                throw new UnprocessableEntityException(message)
            }

            const updatedIds = await this.ruleSetRepo.update(updates, sr)
            await Promise.all(
                updatedIds.map(id => this.ruleSetRepo.cleanSets(id, sr, manager)),
            )
            if (rules && rules.length > 0) {
                await this.ruleSetRepo.createRules(rules, manager)
                await this.reloadDialPlan(sr)
            }
            return updatedIds
        })


        return tx
    }

    async delete(ids: number[], sr: ServiceRequest): Promise<number[]> {
        let sets: internal.RewriteRuleSet[]

        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        if (sets.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != sets.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        const deletedIds = await this.ruleSetRepo.delete(ids, sr)

        await this.reloadDialPlan(sr)

        return deletedIds
    }

    async cleanSets(ids: number[], sr: ServiceRequest): Promise<void> {
        let sets: internal.RewriteRuleSet[]
        if (sr.user.reseller_id_required) {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr, {resellerId: sr.user.reseller_id})
        } else {
            sets = await this.ruleSetRepo.readWhereInIds(ids, sr)
        }

        if (sets.length == 0) {
            throw new NotFoundException()
        } else if (ids.length != sets.length) {
            const error:ErrorMessage = this.i18n.t('errors.ENTRY_NOT_FOUND')
            const message = GenerateErrorMessageArray(ids, error.message)
            throw new UnprocessableEntityException(message)
        }

        await Promise.all(
            ids.map(id => this.ruleSetRepo.cleanSets(id, sr)),
        )
    }

    private async checkPermissions(resellerId: number, sr: ServiceRequest): Promise<void> {
        if (sr.user.resellerId && sr.user.reseller_id != resellerId) {
            throw new NotFoundException()
        }
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

        await this.ruleSetRedisRepo.subscribeToFeedback(
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
        await this.ruleSetRedisRepo.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.ruleSetRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail fast if no response within initialTimeout
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.ruleSetRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            // fail if total timeout exceeded
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.ruleSetRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                throw new InternalServerErrorException(error)
            }

            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.ruleSetRedisRepo.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
    }
}
