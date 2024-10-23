import {Module} from '@nestjs/common'
import {PbxController} from '~/api/pbx/pbx.controller'

@Module({
    controllers: [PbxController],
})
export class PbxModule {
}
