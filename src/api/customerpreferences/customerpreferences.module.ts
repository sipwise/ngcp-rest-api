import {Module} from '@nestjs/common'
import {CustomerpreferencesService} from './customerpreferences.service'
import {CustomerpreferencesController} from './customerpreferences.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [CustomerpreferencesService],
    controllers: [CustomerpreferencesController],
})
export class CustomerpreferencesModule {
}
