import {Module} from '@nestjs/common'

import {PeeringOverviewController} from './overview.controller'

@Module({
    controllers: [PeeringOverviewController],
})
export class PeeringOverviewModule {
}
