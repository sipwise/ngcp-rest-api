import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {PeeringGroupController} from './group.controller'
import {PeeringGroupService} from './group.service'
import {PeeringGroupMariadbRepository} from './repositories/group.mariadb.repository'
import {PeeringGroupRedisRepository} from './repositories/group.redis.repository'

import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [PeeringGroupController],
    providers: [
        PeeringGroupController,
        PeeringGroupService,
        PeeringGroupMariadbRepository,
        PeeringGroupRedisRepository,
    ],
    exports: [
        PeeringGroupController,
        PeeringGroupService,
    ],
})
export class PeeringGroupModule {
}
