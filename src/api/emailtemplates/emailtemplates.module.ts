import {Module} from '@nestjs/common'
import {EmailtemplatesService} from './emailtemplates.service'
import {EmailtemplatesController} from './emailtemplates.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [EmailtemplatesService],
    controllers: [EmailtemplatesController],
})
export class EmailtemplatesModule {
}
