import {InterceptorModule} from '../../interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {VoicemailsController} from './voicemails.controller'
import {VoicemailsService} from './voicemails.service'
import {ExpandModule} from '../../helpers/expand.module'
import {VoicemailsMariadbRepository} from './repositories/voicemails.mariadb.repository'

@Module({
    imports: [InterceptorModule, ExpandModule],
    providers: [VoicemailsService, VoicemailsMariadbRepository],
    controllers: [VoicemailsController],
    exports: [VoicemailsService],
})

export class VoicemailsModule {
}
