import {Module} from '@nestjs/common'
import {VoicemailsService} from './voicemails.service'
import {VoicemailsController} from './voicemails.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [VoicemailsService],
    controllers: [VoicemailsController],
})
export class VoicemailsModule {
}
