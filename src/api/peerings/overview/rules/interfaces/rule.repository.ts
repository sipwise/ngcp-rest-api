import {internal} from '~/entities'
import {ServiceRequest} from '~/interfaces/service-request.interface'

export interface PeeringRuleOverviewRepository {
    readAll(sr: ServiceRequest): Promise<[internal.PeeringOverviewRule[], number]>

    readById(id: string, sr: ServiceRequest): Promise<internal.PeeringOverviewRule>
}
