import {Module} from '@nestjs/common'
import {NCOSController} from '~/api/ncos/ncos.controller'

@Module({
    controllers: [NCOSController],
})
export class NCOSModule {
}
