import {Inject, Injectable} from '@nestjs/common'

import {AppService} from '~/app.service'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Injectable()
export class HeaderManipulationSetRedisRepository {
    constructor(
        private readonly app: AppService,
        @Inject (TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async invalidateRuleSet(setId: number, _sr: ServiceRequest): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-invalidate-ruleset',
            task: 'kam_proxy_invalidate_ruleset',
            dst: '*|state=active;role=proxy',
            options: {
                path: '/hm_invalidate_ruleset/',
                headers: `"P-NGCP-HM-Invalidate-Rule-Set": ${setId.toString()}`,
            },
        })

        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }
}
