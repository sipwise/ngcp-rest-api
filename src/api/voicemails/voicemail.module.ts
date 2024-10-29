import {Module} from '@nestjs/common'

import {VoicemailMariadbRepository} from './repositories/voicemail.mariadb.repository'
import {VoicemailController} from './voicemail.controller'
import {VoicemailService} from './voicemail.service'

import {ExpandModule} from '~/helpers/expand.module'
import {InterceptorModule} from '~/interceptors/interceptor.module'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [VoicemailService, VoicemailMariadbRepository],
    controllers: [VoicemailController],
    exports: [VoicemailService],
})

export class VoicemailModule {
}
