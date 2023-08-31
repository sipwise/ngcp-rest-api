import {Inject, Injectable, InternalServerErrorException, UnprocessableEntityException} from '@nestjs/common'
import {ServiceRequest} from '../../interfaces/service-request.interface'
import {SearchLogic} from '../../helpers/search-logic.helper'
import {LoggerService} from '../../logger/logger.service'
import {I18nService} from 'nestjs-i18n'
import {ClearCallCounterRedisRepository} from './repositories/clear-call-counter.redis.repository'
import {v4 as uuidv4} from 'uuid'
import {Request as TaskAgentRequest} from '../../entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '../../entities/task-agent/response.task-agent.entity'
import {setInterval} from 'timers/promises'

@Injectable()
export class ClearCallCounterService {
    private readonly log = new LoggerService(ClearCallCounterService.name)

    constructor(
        private readonly i18n: I18nService,
        @Inject(ClearCallCounterRedisRepository) private readonly clearCallCounterRepo: ClearCallCounterRedisRepository,
    ) {
    }

    async create(sr: ServiceRequest): Promise<boolean> {
        this.log.debug({
            message: 'clear call counters',
            func: this.create.name,
            user: sr.user.username,
        })

        const publishChannel = 'ngcp-task-agent-redis'
        const feedbackChannel = 'ngcp-rest-api-clear-call-counters-' + uuidv4()

        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task: 'clear_call_counters',
            src: 'sp1',
            dst: 'sp1',
            options: {
                'feedback_channel': feedbackChannel,
            },
        }

        let response: TaskAgentResponse
        let status = ''

        await this.clearCallCounterRepo.subscribeToFeedback(feedbackChannel, async (feedbackResponse: TaskAgentResponse): Promise<void> => {
            this.log.debug('got task agent response: ', JSON.stringify(feedbackResponse))
            status = feedbackResponse.status
            if (status != 'accepted')
                response = feedbackResponse
        })

        this.log.debug(`publish to task agent '${publishChannel}': ${JSON.stringify(request)}`)
        await this.clearCallCounterRepo.publishToTaskAgent(publishChannel, request)

        let timeout = 2000
        for await (const startTime of setInterval(100, Date.now())) {
            const now = Date.now()
            if (response) {
                if (status == 'accepted') {
                    timeout = 5000
                } else if (status == 'done') {
                    this.clearCallCounterRepo.unsubscriberFromFeedback(feedbackChannel)
                    break
                } else if (status == 'error') {
                    this.log.error(`Error response from the task agent: ${response.reason}`)
                    this.clearCallCounterRepo.unsubscriberFromFeedback(feedbackChannel)
                    throw new InternalServerErrorException('Could not process request')
                }
            }
            if ((now - startTime) > timeout) {
                this.log.error('Timeout when waiting for the task agent response')
                this.clearCallCounterRepo.unsubscriberFromFeedback(feedbackChannel)
                throw new InternalServerErrorException('Could not process request')
            }
        }

        return true
    }

    async readAll(sr: ServiceRequest): Promise<[string[], number]> {
        this.log.debug({
            message: 'read all call counters',
            func: this.readAll.name,
            user: sr.user.username,
        })

        const publishChannel = 'ngcp-task-agent-redis'
        const feedbackChannel = 'ngcp-rest-api-get-stuck-calls-' + uuidv4()

        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task: 'get_stuck_calls',
            src: 'sp1',
            dst: 'sp1',
            options: {
                'feedback_channel': feedbackChannel,
            },
        }

        let response: TaskAgentResponse
        let status = ''

        await this.clearCallCounterRepo.subscribeToFeedback(feedbackChannel, async (feedbackResponse: TaskAgentResponse): Promise<void> => {
            this.log.debug('got task agent response: ', JSON.stringify(feedbackResponse))
            status = feedbackResponse.status
            if (status != 'accepted')
                response = feedbackResponse
        })

        this.log.debug(`publish to task agent '${publishChannel}': ${JSON.stringify(request)}`)
        await this.clearCallCounterRepo.publishToTaskAgent(publishChannel, request)

        let timeout = 2000
        for await (const startTime of setInterval(100, Date.now())) {
            const now = Date.now()
            if (response) {
                if (status == 'accepted') {
                    timeout = 5000
                } else if (status == 'done') {
                    this.clearCallCounterRepo.unsubscriberFromFeedback(feedbackChannel)
                    break
                } else if (status == 'error') {
                    this.log.error(`Error response from the task agent: ${response.reason}`)
                    this.clearCallCounterRepo.unsubscriberFromFeedback(feedbackChannel)
                    throw new InternalServerErrorException('Could not process request')
                }
            }
            if ((now - startTime) > timeout) {
                this.log.error('Timeout when waiting for the task agent response')
                this.clearCallCounterRepo.unsubscriberFromFeedback(feedbackChannel)
                throw new InternalServerErrorException('Could not process request')
            }
        }

        let [callIds, count]: [string[], number] = [[], 0]
        if (!response.data)
            return [callIds, count]

        const [page, rows] = SearchLogic.getPaginationFromServiceRequest(sr)
        const calls = response.data.split('\n')
        const rx = /^CallID:\[(.+)\]\s+/
        await Promise.all(calls.map(async (call: string) => {
            const callId = call.match(rx)
            if (callId && callId[1])
                callIds.push(callId[1])
        }))
        count = callIds.length
        callIds = callIds.slice((page -1) * rows, page * rows)
        return [callIds, count]
    }
}
