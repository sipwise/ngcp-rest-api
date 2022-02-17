import {Module} from '@nestjs/common'
import {SystemcontactsService} from './systemcontacts.service'
import {SystemcontactsController} from './systemcontacts.controller'
import {JournalsModule} from '../journals/journals.module'
import {ExpandModule} from '../../helpers/expand.module'

@Module({
    imports: [JournalsModule, ExpandModule],
    providers: [SystemcontactsService],
    controllers: [SystemcontactsController],
})
export class SystemcontactsModule {
}
