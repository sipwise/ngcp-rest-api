import {Module} from '@nestjs/common'
import {NCOSController} from './ncos.controller'

@Module({
    controllers: [NCOSController],
})
export class NCOSModule {
}
