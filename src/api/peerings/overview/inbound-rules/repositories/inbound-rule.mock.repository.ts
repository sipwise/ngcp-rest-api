import {NotFoundException} from '@nestjs/common'

import {PeeringInboundRuleOverviewRepository} from '~/api/peerings/overview/inbound-rules/interfaces/inbound-rule.repository'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class PeeringInboundRuleOverviewMockRepository implements PeeringInboundRuleOverviewRepository {
    readonly db: Record<string, internal.PeeringOverviewInboundRule> = {}

    readAll(_sr: ServiceRequest): Promise<[internal.PeeringOverviewInboundRule[], number]> {
        const rules = Object.values(this.db)
        return Promise.resolve([rules, rules.length])
    }

    readById(id: string, _sr: ServiceRequest): Promise<internal.PeeringOverviewInboundRule> {
        if (!this.db[id])
            throw new NotFoundException()
        return Promise.resolve(this.db[id])
    }
}
