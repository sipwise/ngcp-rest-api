import {Inject, Injectable} from '@nestjs/common'

import {AppService} from '~/app.service'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Injectable()
export class RewriteRuleSetRedisRepository {
    constructor(
        private readonly app: AppService,
        @Inject (TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async reloadDialPlan(_sr: ServiceRequest): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-dialplan-reload',
            task: 'kam_proxy_dialplan_reload',
            dst: '*|state=active;role=proxy',
        })

        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }
}
