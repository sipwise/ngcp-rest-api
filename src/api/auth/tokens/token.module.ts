import {Module} from '@nestjs/common'

import {AuthTokenRedisRepository} from './repositories/token.redis.repository'
import {AuthTokenController} from './token.controller'
import {AuthTokenService} from './token.service'

@Module({
    controllers: [AuthTokenController],
    providers: [AuthTokenService, AuthTokenRedisRepository],
    exports: [AuthTokenRedisRepository],
})
export class AuthTokenModule {
}
