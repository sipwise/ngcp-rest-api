import {Module} from '@nestjs/common'

import {TaskAgentHelper} from './task-agent.helper'

@Module({
    providers: [
        TaskAgentHelper,
    ],
    exports: [TaskAgentHelper],
})
export class TaskAgentModule {}