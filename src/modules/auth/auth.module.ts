import {Module} from '@nestjs/common';
import {AuthService} from './auth.service';
import {AdminsModule} from "../admins/admins.module";
import {PassportModule} from "@nestjs/passport";
import {BasicHTTPStrategy, BasicJSONStrategy} from "./basic.strategy";
import {CertStrategy} from "./cert.strategy";
import {JwtModule} from "@nestjs/jwt";
import {jwtConstants} from "../../core/constants";
import {JwtStrategy} from "./jwt.strategy";

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
