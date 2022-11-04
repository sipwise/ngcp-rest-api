import {forwardRef, Module} from '@nestjs/common'
import {JournalsModule} from '../journals/journals.module'
import {CustomerSpeedDialController} from './customer-speed-dial.controller'
import {CustomerSpeedDialService} from './customer-speed-dial.service'
import {ExpandModule} from '../../helpers/expand.module'
import {CustomerSpeedDialMariadbRepository} from './repositories/customer-speed-dial.mariadb.repository'

@Module({
    imports: [
        JournalsModule,
        forwardRef(() => ExpandModule),
    ],
    controllers: [CustomerSpeedDialController],
    providers: [CustomerSpeedDialService, CustomerSpeedDialMariadbRepository],
})
export class CustomerSpeedDialModule {
}
