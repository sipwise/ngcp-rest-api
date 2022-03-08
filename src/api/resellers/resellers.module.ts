import {forwardRef, Module} from '@nestjs/common'
import {ResellersService} from './resellers.service'
import {ResellersController} from './resellers.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [ResellersService],
    controllers: [ResellersController],
    exports: [ResellersService],
})
export class ResellersModule {
}
