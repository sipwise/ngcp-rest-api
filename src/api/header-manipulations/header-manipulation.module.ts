import {Module,forwardRef} from '@nestjs/common'

import {HeaderManipulationController} from './header-manipulation.controller'

import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        forwardRef(() => ExpandModule),
    ],
    controllers: [HeaderManipulationController],
})
export class HeaderManipulationModule {
}
