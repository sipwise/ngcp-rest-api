import {NotFoundException} from '@nestjs/common'

import {PeeringRuleOverviewRepository} from '~/api/peerings/overview/rules/interfaces/rule.repository'
import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export class PeeringRuleOverviewMockRepository implements PeeringRuleOverviewRepository {
    readonly db: Record<string, internal.PeeringOverviewRule> = {}

    readAll(_sr: ServiceRequest): Promise<[internal.PeeringOverviewRule[], number]> {
        const rules = Object.values(this.db)
        return Promise.resolve([rules, rules.length])
    }

    readById(id: string, _sr: ServiceRequest): Promise<internal.PeeringOverviewRule> {
        if (!this.db[id])
            throw new NotFoundException()
        return Promise.resolve(this.db[id])
    }
}
