import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PeeringInboundRuleOverviewRepository {
    readAll(sr: ServiceRequest): Promise<[internal.PeeringOverviewInboundRule[], number]>

    readById(id: string, sr: ServiceRequest): Promise<internal.PeeringOverviewInboundRule>
}
