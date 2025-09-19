import {Inject, Injectable} from '@nestjs/common'

import {AppService} from '~/app.service'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Injectable()
export class ClearCallCounterRedisRepository {
    constructor(
        private readonly app: AppService,
        @Inject (TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async clearCallCounters(_sr: ServiceRequest): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-clear-call-counters',
            task: 'clear_call_counters',
            dst: '*|state=active;role=proxy',
        })

        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }

    async getStuckCalls(sr: ServiceRequest): Promise<string[]> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-get-stuck-calls',
            task: 'get_stuck_calls',
            dst: '*|state=active;role=proxy',
            data: JSON.stringify({user: sr.user.username}),
        })

        const stuckCallIds = await this.taskAgentHelper.invokeTask<string>(
            publishChannel,
            feedbackChannel,
            request,
            async (d, result) => {
                if (typeof d === 'string') {
                    const calls = d.split('\n')
                    const rx = /^CallID:\[(.+)\]\s+/
                    for (const call of calls) {
                        const callId = call.match(rx)
                        if (callId && callId[1]) {
                            result.push(callId[1])
                        }
                    }
                }
                if (typeof d === 'object' && d && 'CallID' in d) {
                    result.push((d as { CallID: string }).CallID)
                }
            },
        )
        return stuckCallIds
    }
}
