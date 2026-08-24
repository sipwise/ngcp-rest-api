import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {PeeringRuleMariadbRepository} from './repositories/rule.mariadb.repository'
import {PeeringRuleRedisRepository} from './repositories/rule.redis.repository'
import {PeeringRuleController} from './rule.controller'
import {PeeringRuleService} from './rule.service'

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
