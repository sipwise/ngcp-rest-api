import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {PeeringGroupServerController} from './peering-group-server.controller'
import {PeeringGroupServerService} from './peering-group-server.service'
import {PeeringGroupServerMariadbRepository} from './repositories/peering-group-server.mariadb.repository'
import {PeeringGroupServerRedisRepository} from './repositories/peering-group-server.redis.repository'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
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
