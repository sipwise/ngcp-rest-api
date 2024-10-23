import {InterceptorModule} from '~/interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {VoicemailController} from '~/api/voicemails/voicemail.controller'
import {VoicemailService} from '~/api/voicemails/voicemail.service'
import {ExpandModule} from '~/helpers/expand.module'
import {VoicemailMariadbRepository} from '~/api/voicemails/repositories/voicemail.mariadb.repository'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [VoicemailService, VoicemailMariadbRepository],
    controllers: [VoicemailController],
    exports: [VoicemailService],
})

export class VoicemailModule {
}
