import {Inject, Injectable, StreamableFile} from '@nestjs/common'

import {PeeringInboundRuleOverviewResponseDto} from './dto/inbound-rule-response.dto'
import {PeeringInboundRuleOverviewMariadbRepository} from './repositories/inbound-rule.mariadb.repository'

import {AppService} from '~/app.service'
import {internal} from '~/entities'
import {dtoToCsv} from '~/helpers/csv.helper'
import {mapYield} from '~/helpers/yield.helper'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Injectable()
export class PeeringInboundRuleOverviewService {
    constructor(
        @Inject(PeeringInboundRuleOverviewMariadbRepository) private readonly ruleRepo: PeeringInboundRuleOverviewMariadbRepository,
        @Inject(AppService) private readonly app: AppService,
    ) {
    }

    async readAll(sr: ServiceRequest): Promise<[internal.PeeringOverviewInboundRule[], number]> {
        return await this.ruleRepo.readAll(sr)
    }

    async read(id: string, sr: ServiceRequest): Promise<internal.PeeringOverviewInboundRule> {
        return await this.ruleRepo.readById(id, sr)
    }

    async exportCsv(sr: ServiceRequest): Promise<StreamableFile> {
        const [rules] = await this.readAll(sr)
        const dtos = await mapYield(rules, rule => {
            const {resourceUrl, ...dto} = new PeeringInboundRuleOverviewResponseDto(rule)
            return dto
        })

        const csv = await dtoToCsv(dtos, {
            numericBooleans: this.app.config.csv.export_boolean_format === 'numeric',
        })

        const buffer = Buffer.from(csv, 'utf-8')
        return new StreamableFile(Uint8Array.from(buffer), {
            type: 'text/csv',
            disposition: 'attachment; filename="peering_overview_inbound_rules.csv"',
        })
    }
}
