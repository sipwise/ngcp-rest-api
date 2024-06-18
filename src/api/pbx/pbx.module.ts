import {Module} from '@nestjs/common'
import {PbxController} from './pbx.controller'

@Module({
    controllers: [PbxController],
})
export class PbxModule {
}
