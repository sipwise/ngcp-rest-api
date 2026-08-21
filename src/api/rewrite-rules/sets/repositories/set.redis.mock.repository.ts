import {Injectable} from '@nestjs/common'

import {TaskAgentMockHelper} from '~/helpers/task-agent-mock.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'
import {LoggerService} from '~/logger/logger.service'

@Injectable()
export class RewriteRuleSetMockRedisRepository {
    private readonly log = new LoggerService(RewriteRuleSetMockRedisRepository.name)
    constructor(
        private readonly taskAgentHelper: TaskAgentMockHelper,
    ) {
    }

    async reloadDialPlan(_sr: ServiceRequest): Promise<void> {
        const {publishChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-dialplan-reload',
            task: 'kam_proxy_dialplan_reload',
            dst: '*|state=active;role=proxy',
        })
        this.log.debug(`publish to task agent '${publishChannel}': ${JSON.stringify(request)}`)
        this.log.debug('All task agents completed successfully')
    }
}
