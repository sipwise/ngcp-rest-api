import {Inject, Injectable} from '@nestjs/common'

import {TaskAgentHelper} from '~/helpers/task-agent.helper'

@Injectable()
export class SubscriberRedisRepository {
    constructor(
        @Inject(TaskAgentHelper) private readonly taskAgentHelper: TaskAgentHelper,
    ) {
    }

    /**
     * Removes the registered locations of the AORs (`user@domain`) on the proxies
     */
    async removeLocations(aors: string[]): Promise<void> {
        for (const aor of aors) {
            const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
                feedbackChannel: 'ngcp-rest-api-usr-loc-remove',
                task: 'kam_proxy_usr_loc_remove',
                dst: '*|state=active;role=proxy',
                data: JSON.stringify({extra_args: `location ${aor}`}),
            })
            await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
        }
    }

    async reloadTrustedHosts(): Promise<void> {
        const {publishChannel, feedbackChannel, request} = this.taskAgentHelper.buildRequest({
            feedbackChannel: 'ngcp-rest-api-trusted-hosts-reload',
            task: 'kam_proxy_trusted_hosts_reload',
            dst: '*|state=active;role=proxy',
        })
        await this.taskAgentHelper.invokeTask(publishChannel, feedbackChannel, request)
    }
}
