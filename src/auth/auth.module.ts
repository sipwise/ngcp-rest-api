import {Global, Module} from '@nestjs/common'
import {JwtModule} from '@nestjs/jwt'
import {PassportModule} from '@nestjs/passport'

import {AuthService} from './auth.service'
import {BasicHTTPStrategy, BasicJSONStrategy} from './basic.strategy'
import {CertStrategy} from './cert.strategy'
import {JwtStrategy} from './jwt.strategy'

import {AuthTokenModule} from '~/api/auth/tokens/token.module'
import {AppService} from '~/app.service'
import {jwtConstants} from '~/config/constants.config'

const {jwt_default_ttl: defTtl} = AppService.config.common

@Global()
@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
            signOptions: {expiresIn: defTtl},
        }),
        AuthTokenModule,
    ],
    providers: [
        AuthService,
        BasicHTTPStrategy,
        BasicJSONStrategy,
        CertStrategy,
        JwtStrategy,
    ],
    exports: [
        AuthService,
        JwtModule,
    ],
})
export class AuthModule {
}
