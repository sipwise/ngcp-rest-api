import {Inject, Injectable} from '@nestjs/common'

import {AppService} from '~/app.service'
import {TaskAgentHelper} from '~/helpers/task-agent.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Injectable()
export class PeeringInboundRuleRedisRepository {
    constructor(
        private readonly app: AppService,
        @Inject (TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async reloadKamProxLcr(_sr: ServiceRequest): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-lcr-reload',
            task: 'kam_proxy_lcr_reload',
            dst: '*|state=active;role=proxy',
        })

        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }

    async reloadKamProxDispatcher(_sr: ServiceRequest): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-dispatcher-reload',
            task: 'kam_proxy_dispatcher_reload',
            dst: '*|state=active;role=proxy',
        })

        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }
}