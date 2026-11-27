import {Inject, Injectable} from '@nestjs/common'

import {TaskAgentHelper} from '~/helpers/task-agent.helper'

@Injectable()
export class DomainRedisRepository {
    constructor(
        @Inject(TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    async reloadDomains(): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-domain-reload',
            task: 'kam_proxy_domain_reload',
            dst: '*|state=active;role=proxy',
        })
        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }

    /**
     * Removes the permanent registrations of the domains through the task agent. Waits for the task at most
     * 10 s, a task that runs longer goes on without the request waiting for it
     */
    async removePermanentLocations(domains: string[]): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-redis-delete-permanent-registrations',
            task: 'redis_delete_permanent_registrations',
            dst: '*|state=active;role=proxy',
            data: JSON.stringify({domains: domains.join(',')}),
        })
        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request, undefined, {longRunning: true})
    }
}
