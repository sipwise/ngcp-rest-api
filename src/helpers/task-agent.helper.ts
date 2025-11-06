import os from 'os'
import {setInterval} from 'timers/promises'

import {Injectable, InternalServerErrorException} from '@nestjs/common'
import {I18nService} from 'nestjs-i18n'
import {v4 as uuidv4} from 'uuid'

import {AppService} from '~/app.service'
import {HandleRedisErrors} from '~/decorators/handle-redis-errors.decorator'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {ErrorMessage} from '~/interfaces/error-message.interface'
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
        const agentStatus = new Map<string, string>()
        const startTime = Date.now()
        const initialTimeout = 2000
        const maxTimeout = 5000
        const onDoneWaitTimeout = 500
        const result: (T | string)[] = []

        let onDoneSince: number | null = null
        let hasError = false
        let errorReason = ''
        let firstResponseReceived = false
        await this.subscribeToFeedback(
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
        this.log.debug(`publish to task agent '${publishChannel}': ${JSON.stringify(request)}`)
        await this.publishToTaskAgent(publishChannel, request)

        for await (const _ of setInterval(100)) {
            const now = Date.now()
            if (hasError) {
                await this.unsubscriberFromFeedback(feedbackChannel)
                this.log.error(`Task agent error: ${errorReason}`)
                /*
                 TODO: this exception is raised after transaction commit + response
                 and therefore, not intercepted and causes the server to stop with ret code 1
                 need to find a way to issue transaction commit before response
                */
                //const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                //throw new InternalServerErrorException(error)
            }
            if (!firstResponseReceived && (now - startTime) > initialTimeout) {
                await this.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for initial task agent response')
                //const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                //throw new InternalServerErrorException(error)
            }
            if (firstResponseReceived && (now - startTime) > maxTimeout) {
                await this.unsubscriberFromFeedback(feedbackChannel)
                this.log.error('Timeout waiting for all task agent responses')
                //const error: ErrorMessage = this.i18n.t('errors.TASK_AGENT_COULD_NOT_PROCESS_REQUEST')
                //throw new InternalServerErrorException(error)
            }
            const allDone = [...agentStatus.values()].every(status => status === 'done')
            if (agentStatus.size > 0 && allDone) {
                if (onDoneSince === null) {
                    onDoneSince = now
                } else if ((now - onDoneSince) > onDoneWaitTimeout) {
                    await this.unsubscriberFromFeedback(feedbackChannel)
                    this.log.debug('All task agents completed successfully')
                    break
                }
            } else {
                onDoneSince = null
            }
        }
        return result
    }
}
