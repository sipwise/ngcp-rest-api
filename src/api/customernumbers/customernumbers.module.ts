import {forwardRef, Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'
import {CustomernumbersController} from './customernumbers.controller'
import {CustomernumbersService} from './customernumbers.service'
import {CustomernumbersMariadbRepository} from './repositories/customernumbers.mariadb.repository'

@Module({

    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [CustomernumbersController],
    providers: [
        CustomernumbersController,
        CustomernumbersService,
        CustomernumbersMariadbRepository,
    ],
})
export class CustomernumbersModule {
}
