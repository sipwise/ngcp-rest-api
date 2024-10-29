import {Global, Module} from '@nestjs/common'
import {JwtModule} from '@nestjs/jwt'
import {PassportModule} from '@nestjs/passport'

import {AuthService} from './auth.service'
import {BasicHTTPStrategy, BasicJSONStrategy} from './basic.strategy'
import {CertStrategy} from './cert.strategy'
import {JwtStrategy} from './jwt.strategy'

import {jwtConstants} from '~/config/constants.config'

@Global()
@Module({
    imports: [
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
            signOptions: {expiresIn: '1d'},
        }),
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
