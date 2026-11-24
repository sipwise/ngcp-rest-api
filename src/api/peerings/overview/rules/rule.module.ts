import {Module} from '@nestjs/common'

import {PeeringRuleOverviewMariadbRepository} from './repositories/rule.mariadb.repository'
import {PeeringRuleOverviewController} from './rule.controller'
import {PeeringRuleOverviewService} from './rule.service'

@Module({
    providers: [PeeringRuleOverviewService, PeeringRuleOverviewMariadbRepository],
    controllers: [PeeringRuleOverviewController],
})
export class PeeringRuleOverviewModule {
}
