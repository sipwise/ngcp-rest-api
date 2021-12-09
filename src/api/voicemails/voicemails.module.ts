import {InterceptorModule} from '../../interceptors/interceptor.module'
import {Module} from '@nestjs/common'
import {VoicemailsController} from './voicemails.controller'
import {VoicemailsService} from './voicemails.services'

@Module({
    imports: [InterceptorModule],
    providers: [VoicemailsService],
    controllers: [VoicemailsController],
    exports: [VoicemailsService],
})

export class VoicemailsModule {}