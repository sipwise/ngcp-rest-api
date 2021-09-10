import {Module} from '@nestjs/common'
import {CustomercontactsService} from './customercontacts.service'
import {CustomercontactsController} from './customercontacts.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    controllers: [CustomercontactsController],
    providers: [CustomercontactsService],
})
export class CustomercontactsModule {
}
