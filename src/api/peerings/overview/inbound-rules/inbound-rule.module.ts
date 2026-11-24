import {Module} from '@nestjs/common'

import {PeeringInboundRuleOverviewController} from './inbound-rule.controller'
import {PeeringInboundRuleOverviewService} from './inbound-rule.service'
import {PeeringInboundRuleOverviewMariadbRepository} from './repositories/inbound-rule.mariadb.repository'

@Module({
    providers: [PeeringInboundRuleOverviewService, PeeringInboundRuleOverviewMariadbRepository],
    controllers: [PeeringInboundRuleOverviewController],
})
export class PeeringInboundRuleOverviewModule {
}
