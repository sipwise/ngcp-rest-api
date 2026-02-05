import {Module,forwardRef} from '@nestjs/common'
import {JournalModule} from 'api/journals/journal.module'
import {ExpandModule} from 'helpers/expand.module'

import {PeeringInboundRuleController} from './peering-inbound-rule.controller'
import {PeeringInboundRuleService} from './peering-inbound-rule.service'
import {PeeringInboundRuleMariadbRepository} from './repositories/peering-inbound-rule.mariadb.repository'
import {PeeringInboundRuleRedisRepository} from './repositories/peering-inbound-rule.redis.repository'

import {TaskAgentModule} from '~/helpers/task-agent.module'

@Module({
    imports: [
        JournalModule,
        forwardRef(() => ExpandModule),
        forwardRef(() => TaskAgentModule),
    ],
    controllers: [PeeringInboundRuleController],
    providers: [
        PeeringInboundRuleService,
        PeeringInboundRuleMariadbRepository,
        PeeringInboundRuleRedisRepository,
    ],
})
export class PeeringInboundRuleModule {
}
