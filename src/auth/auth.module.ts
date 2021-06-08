import {Module} from '@nestjs/common'
import {AuthService} from './auth.service'
import {AdminsModule} from '../api/admins/admins.module'
import {PassportModule} from '@nestjs/passport'
import {JwtModule} from '@nestjs/jwt'
import {jwtConstants} from '../config/constants.config'
import {BasicHTTPStrategy, BasicJSONStrategy} from './basic.strategy'
import {CertStrategy} from './cert.strategy'
import {JwtStrategy} from './jwt.strategy'

@Module({
    imports: [
        AdminsModule,
        PassportModule,
        JwtModule.register({
            secret: jwtConstants.secret,
            signOptions: {expiresIn: '10m'},
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
