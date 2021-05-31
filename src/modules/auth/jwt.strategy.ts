import {Injectable} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {ExtractJwt, Strategy} from "passport-jwt";
import {jwtConstants} from "../../core/constants";

/**
 * Implementation of the JWT authentication strategy
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    /**
     * Extracts the JWT from the passed bearer token
     */
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConstants.secret,
        });
    }

    /**
     * Validate is only called if the JWT was successfully extracted from the authentication header
     * @param payload Extracted JWT
     * @returns token User information contained in the JWT
     */
    async validate(payload: any) {
        return {userId: payload.sub, username: payload.username};
    }
}
