import {Module} from '@nestjs/common'
import {AdminsController} from './admins.controller'
import {AdminsService} from './admins.service'
import {AdminsRepository} from './admins.repository'
import {ExpandModule} from '../../helpers/expand.module'
import {JournalsModule} from '../journals/journals.module'
import {JournalsService} from '../journals/journals.service'

@Module({
    imports: [
        ExpandModule,
        JournalsModule,
    ],
    controllers: [AdminsController],
    exports: [
        AdminsService,
        AdminsRepository,
    ],
    providers: [
        AdminsRepository,
        AdminsService,
        JournalsService,
    ],
})
export class AdminsModule {
}
