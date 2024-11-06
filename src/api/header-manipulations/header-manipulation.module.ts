import {Module} from '@nestjs/common'

import {HeaderManipulationController} from './header-manipulation.controller'

@Module({
    controllers: [HeaderManipulationController],
})
export class HeaderManipulationModule {
}
