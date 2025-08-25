import {Module} from '@nestjs/common'

import {PeeringController} from './peering.controller'

@Module({
    controllers: [PeeringController],
})
export class PeeringModule {
}
