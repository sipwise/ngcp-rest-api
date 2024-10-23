import {Global, Module} from '@nestjs/common'
import {JwtModule} from '@nestjs/jwt'
import {PassportModule} from '@nestjs/passport'
import {jwtConstants} from '~/config/constants.config'
import {AuthService} from '~/auth/auth.service'
import {BasicHTTPStrategy, BasicJSONStrategy} from '~/auth/basic.strategy'
import {CertStrategy} from '~/auth/cert.strategy'
import {JwtStrategy} from '~/auth/jwt.strategy'

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
