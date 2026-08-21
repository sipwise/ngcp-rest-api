import {Module} from '@nestjs/common'

import {AuthJwtController} from './jwt.controller'

@Module({
    controllers: [AuthJwtController],
})
export class AuthJwtModule {
}
