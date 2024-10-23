import {forwardRef, Module} from '@nestjs/common'
import {HeaderManipulationController} from '~/api/header-manipulations/header-manipulation.controller'
import {ExpandModule} from '~/helpers/expand.module'

@Module({
    imports: [
        forwardRef(() => ExpandModule),
    ],
    controllers: [HeaderManipulationController],
})
export class HeaderManipulationModule {
}
