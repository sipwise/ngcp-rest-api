import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {PeeringRuleController} from './peering-rule.controller'
import {PeeringRuleService} from './peering-rule.service'
import {PeeringRuleMariadbRepository} from './repositories/peering-rule.mariadb.repository'
import {PeeringRuleRedisRepository} from './repositories/peering-rule.redis.repository'

import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [PeeringRuleController],
    providers: [
        PeeringRuleService,
        PeeringRuleMariadbRepository,
        PeeringRuleRedisRepository,
    ],
})
export class PeeringRuleModule {
}
