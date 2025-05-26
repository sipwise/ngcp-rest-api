/* eslint-disable no-console */
import {Injectable} from '@nestjs/common'

import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {Response as TaskAgentResponse} from '~/entities/task-agent/response.task-agent.entity'

@Injectable()
export class RewriteRuleMockRedisRepository {
    private subscriptions: { [channel: string]: (response: TaskAgentResponse) => Promise<void> } = {}

    async publishToTaskAgent(_publishChannel: string, request: TaskAgentRequest): Promise<void> {
        const feedbackChannel = request.options?.feedback_channel
        if (!feedbackChannel) {
            return
        }

        setTimeout(async () => {
            const response: TaskAgentResponse = {
                uuid: request.uuid,
                ref: request.uuid,
                task: request.task,
                src: request.src,
                dst: request.dst,
                timestamp: Date.now(),
                datetime: new Date().toISOString(),
                chunk: 1,
                chunks: 1,
                status: 'done',
                data: {},
            }

            const callback = this.subscriptions[feedbackChannel]
            if (callback) {
                try {
                    await callback(response)
                } catch (err) {
                    console.error('[MockRedis] Error in callback:', err)
                }
            } else {
                console.warn(`[MockRedis] No subscription found for feedback channel: ${feedbackChannel}`)
            }
        }, 100)
    }

    async subscribeToFeedback(channel: string, callback: (response: TaskAgentResponse) => Promise<void>): Promise<void> {
        this.subscriptions[channel] = callback
    }

    async unsubscriberFromFeedback(channel: string): Promise<void> {
        delete this.subscriptions[channel]
    }
}
