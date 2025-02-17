import {Module} from '@nestjs/common'

import {BanController} from './ban.controller'

@Module({
    controllers: [BanController],
})
export class BanModule {
}
