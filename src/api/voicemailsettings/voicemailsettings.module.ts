import {Module} from '@nestjs/common'
import {VoicemailsettingsService} from './voicemailsettings.service'
import {VoicemailsettingsController} from './voicemailsettings.controller'
import {JournalsModule} from '../journals/journals.module'

@Module({
    imports: [JournalsModule],
    providers: [VoicemailsettingsService],
    controllers: [VoicemailsettingsController],
})
export class VoicemailsettingsModule {
}
