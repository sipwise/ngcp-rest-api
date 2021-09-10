import {Module} from '@nestjs/common'
import {SystemcontactsService} from './systemcontacts.service'
import {SystemcontactsController} from './systemcontacts.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [SystemcontactsService],
    controllers: [SystemcontactsController],
})
export class SystemcontactsModule {
}
