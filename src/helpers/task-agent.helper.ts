import os from 'os'

import {Injectable} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {v4 as uuidv4} from 'uuid'

import {AppService} from '~/app.service'
import {HandleRedisErrors} from '~/decorators/handle-redis-errors.decorator'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {LoggerService} from '~/logger/logger.service'

type MessageCallback = (response: TaskAgentResponse) => Promise<void>

interface BuildRequestParams {
    publishChannel?: string;
    uuid?: string;
    feedbackChannel: string; // required
    task: string;            // required
    src?: string;
    dst?: string;
    options?: Record<string, unknown>;
    data?: Record<string, unknown> | string;
}

@Injectable()
export class TaskAgentHelper {
    private readonly log = new LoggerService(TaskAgentHelper.name)
    private subs: { [key: string]: MessageCallback } = {}
    private onMessageInit = true

    constructor(
        private readonly app: AppService,
        private readonly i18n: I18nService,
    ) {
    }

    @HandleRedisErrors
    async publishToTaskAgent(publishChannel: string, request: TaskAgentRequest): Promise<void> {
        const message = JSON.stringify(request)
        await this.app.redis.publish(publishChannel, message)
    }

    @HandleRedisErrors
    async subscribeToFeedback(feedbackChannel: string, callback: MessageCallback): Promise<void> {
        await this.app.redisPubSub.subscribe(feedbackChannel)
        if (this.onMessageInit) {
            this.app.redisPubSub.on('message', async (channel: string, message: string): Promise<void> => {
                if (channel in this.subs) {
                    const response: TaskAgentResponse = JSON.parse(message)
                    await this.subs[channel](response)
                }
            })
            this.onMessageInit = false
        }
        this.subs[feedbackChannel] = callback
    }

    @HandleRedisErrors
    async unsubscriberFromFeedback(feedbackChannel: string): Promise<void> {
        await this.app.redisPubSub.unsubscribe(feedbackChannel)
        delete this.subs[feedbackChannel]
    }

    buildRequest({
        publishChannel = 'ngcp-task-agent-redis',
        feedbackChannel,
        task,
        src = os.hostname(),
        dst = '*|state=active;role=proxy',
        options = {},
        data = '{}',
    }: BuildRequestParams,
    ): { publishChannel: string; feedbackChannel: string; request: TaskAgentRequest } {
        feedbackChannel = `${feedbackChannel}-${uuidv4()}`
        const request: TaskAgentRequest = {
            uuid: uuidv4(),
            task,
            src,
            dst,
            options: {
                feedback_channel: feedbackChannel,
                ...options,
            },
            data,
        }

        return {publishChannel, feedbackChannel, request}
    }

    async invokeTask<T = unknown>(
        publishChannel: string,
        feedbackChannel: string,
        request: TaskAgentRequest,
        handleOnData?: (data: unknown, ret: (T | string)[]) => Promise<void>,
    ): Promise<(T | string)[]> {
        const agentStatus: {[key: string]: string} = {}
        const errors: {[key: string]: string} = {}
        const startTime = Date.now()
        const initialTimeout = 2000
        const maxTimeout = 10000
        const exceptionTimeout = 30000
        const result: (T | string)[] = []

        await this.subscribeToFeedback(
            feedbackChannel,
            async (feedbackResponse: TaskAgentResponse): Promise<void> => {
                this.log.debug(`got task agent response: ${JSON.stringify(feedbackResponse)}`)
                const {src: host, status, reason} = feedbackResponse
                agentStatus[host] = status

                if (status === 'error') {
                    errors[host] = reason ?? 'Unknown error'
                    this.log.error(`Task error in feedback=${feedbackChannel} src=${host} error=${errors[host]}`)
                }

                if (status === 'done') {
                    this.log.debug(`Task done in feedback=${feedbackChannel} src=${host} reason=${reason || 'ok'}`)
                }

                if (status === 'done' && feedbackResponse.data != undefined) {
                    let parsed: unknown
                    try {
                        parsed = JSON.parse(feedbackResponse.data as string)
                    } catch {
                        result.push(feedbackResponse.data as string)
                        return
                    }
                    const data = Array.isArray(parsed) ? parsed : [parsed]
                    for (const d of data) {
                        if (handleOnData) {
                            await handleOnData(d, result)
                        } else {
                            result.push(d as T)
                        }
                    }
                }
            },
        )

        this.log.debug(`Publish to task agent channel=${publishChannel} feedback=${feedbackChannel}: ${JSON.stringify(request)}`)
        await this.publishToTaskAgent(publishChannel, request)

        while ((Date.now() - startTime) < exceptionTimeout) {
            const now = Date.now()
            const elapsed = now - startTime
            const agentStatusStr = JSON.stringify(agentStatus)
            const errorsStr = JSON.stringify(errors)
            const agentStatusSize = Object.keys(agentStatus).length

            /*
                TODO: this exception is raised after transaction commit + response
                and therefore, not intercepted and causes the server to stop with ret code 1
                need to find a way to issue transaction commit before response
            */
            //const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
            //throw new InternalServerErrorException(error)

            if (agentStatusSize == 0 && elapsed > initialTimeout) {
                this.log.error(`Task no response timeout feedback=${feedbackChannel} status=${agentStatusStr} errors=${errorsStr}`)
                await this.unsubscriberFromFeedback(feedbackChannel)
                return
            }

            if (elapsed > maxTimeout) {
                this.log.error(`Task max response timeout feedback=${feedbackChannel} status=${agentStatusStr} errors=${errorsStr}`)
                await this.unsubscriberFromFeedback(feedbackChannel)
                return
            }

            const allDoneOrError = Object.values(agentStatus).every(status => ['done','error'].includes(status))
            if (agentStatusSize > 0 && allDoneOrError) {
                await this.unsubscriberFromFeedback(feedbackChannel)
                this.log.debug(`Task completed feedback=${feedbackChannel} status=${agentStatusStr} errors=${errorsStr}`)
                break
            }

            await new Promise(resolve => setTimeout(resolve, 100))
        }

        return result
    }
}
