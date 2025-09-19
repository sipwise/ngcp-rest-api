import os from 'os'

import {Injectable} from '@nestjs/common'
import {v4 as uuidv4} from 'uuid'

import {Request as TaskAgentRequest} from '~/entities/task-agent/request.task-agent.entity'
import {LoggerService} from '~/logger/logger.service'

interface BuildRequestParams {
    publishChannel?: string;
    uuid?: string;
    feedbackChannel: string; // required
    task: string;            // required
    src?: string;
    dst?: string;
    options?: Record<string, unknown>;
    data?: Record<string, unknown>;
}

@Injectable()
export class TaskAgentMockHelper {
    private readonly log = new LoggerService(TaskAgentMockHelper.name)

    buildRequest({
        publishChannel = 'ngcp-task-agent-redis',
        feedbackChannel,
        task,
        src = os.hostname(),
        dst = '*|state=active;role=proxy',
        options = {},
        data = {},
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

    async invokeTask(
        publishChannel:string,
        feedbackChannel: string,
        request: TaskAgentRequest,
        handleOnData?: (data, ret: unknown[]) => Promise<void>,
    ): Promise<void> {
        this.log.debug(`publishChannel: ${publishChannel}, feedbackChannel: ${feedbackChannel}, request: ${JSON.stringify(request)}, handleOnData: ${handleOnData.name}`)
        this.log.debug(`publish to task agent '${publishChannel}': ${JSON.stringify(request)}`)
        this.log.debug('All task agents completed successfully')
    }
}