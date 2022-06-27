import {forwardRef, Module} from '@nestjs/common'
import {ResellersService} from './resellers.service'
import {ResellersController} from './resellers.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'
import {ResellersMariadbRepository} from './repositories/resellers.mariadb.repository'

@Module({
    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    providers: [ResellersService, ResellersMariadbRepository],
    controllers: [ResellersController],
    exports: [ResellersService],
})
export class ResellersModule {
}
