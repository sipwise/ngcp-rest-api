import {InterceptorModule} from '../../interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {VoicemailController} from './voicemail.controller'
import {VoicemailService} from './voicemail.service'
import {ExpandModule} from '../../helpers/expand.module'
import {VoicemailMariadbRepository} from './repositories/voicemail.mariadb.repository'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [VoicemailService, VoicemailMariadbRepository],
    controllers: [VoicemailController],
    exports: [VoicemailService],
})

export class VoicemailModule {
}
