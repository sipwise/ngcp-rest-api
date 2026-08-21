import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {PeeringGroupServerController} from './server.controller'
import {PeeringGroupServerService} from './server.service'
import {PeeringGroupServerMariadbRepository} from './repositories/server.mariadb.repository'
import {PeeringGroupServerRedisRepository} from './repositories/server.redis.repository'

import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [PeeringGroupServerController],
    providers: [
        PeeringGroupServerService,
        PeeringGroupServerMariadbRepository,
        PeeringGroupServerRedisRepository,
    ],
})
export class PeeringGroupServerModule {
}
