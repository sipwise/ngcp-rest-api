import {forwardRef, Module} from '@nestjs/common'
import {CustomercontactsService} from './customercontacts.service'
import {CustomercontactsController} from './customercontacts.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [CustomercontactsController],
    providers: [
        CustomercontactsService,
        CustomercontactsController,
    ],
    exports: [
        CustomercontactsController,
        CustomercontactsService,
    ],
})
export class CustomercontactsModule {
}
