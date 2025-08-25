import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {PeeringGroupController} from './peering-group.controller'
import {PeeringGroupService} from './peering-group.service'
import {PeeringGroupMariadbRepository} from './repositories/peering-group.mariadb.repository'

@Module({
    imports: [
        forwardRef(() => JournalModule),
        forwardRef(() => ExpandModule),
    ],
    controllers: [PeeringGroupController],
    providers: [
        PeeringGroupController,
        PeeringGroupService,
        PeeringGroupMariadbRepository,
    ],
    exports: [
        PeeringGroupController,
        PeeringGroupService,
    ],
})
export class PeeringGroupModule {
}
