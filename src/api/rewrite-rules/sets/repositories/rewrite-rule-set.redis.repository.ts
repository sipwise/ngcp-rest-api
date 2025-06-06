import {Injectable} from '@nestjs/common'

import {AppService} from '~/app.service'
import {HandleRedisErrors} from '~/decorators/handle-redis-errors.decorator'
import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'
import {LoggerService} from '~/logger/logger.service'

type MessageCallback = (response: TaskAgentResponse) => Promise<void>

@Injectable()
export class RewriteRuleSetRedisRepository {
    private readonly log = new LoggerService(RewriteRuleSetRedisRepository.name)
    private subs: { [key: string]: MessageCallback } = {}
    private onMessageInit = true

    constructor(
        private readonly app: AppService,
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
}
