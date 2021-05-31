import {Injectable, UnauthorizedException} from "@nestjs/common";
import {PassportStrategy} from "@nestjs/passport";
import {AuthService} from "./auth.service";
import {BasicStrategy} from "passport-http"
import {Strategy} from "passport-local";
import {Admin} from "../admins/admin.entity";

/**
 * Defines authentication function format
 */
interface Authenticator {
    (username: string, password: string, service: AuthService): Promise<Admin>
}

/**
 * Authentication function using `username` and `password` to validate an `Admin`
 * @param username Login username
 * @param password Login password
 * @param service AuthService that is called to validate the Admin
 */
async function pwd_auth(username: string, password: string, service: AuthService): Promise<Admin> {
    const admin = await service.validateAdmin(username, password);
    if (!admin) {
        throw new UnauthorizedException();
    }
    return admin;
}

/**
 * Implementation of Basic authentication strategy by HTTP 'Authorization' header
 */
@Injectable()
export class BasicHTTPStrategy extends PassportStrategy(BasicStrategy) {
    auth: Authenticator;

    /**
     * Creates a new `BasicHTTPStrategy` and sets the authentication method to [`pwd_auth`]{@link pwd_auth}.
     * @param authService AuthService to validate the Admin
     */
    constructor(private authService: AuthService) {
        super();
        this.auth = pwd_auth;
    }

    /**
     * Validates an Admin user with username and password
     * @param username Username in 'Authorization' header
     * @param password Password in 'Authorization' header
     */
    async validate(username: string, password: string): Promise<any> {
        return await this.auth(username, password, this.authService);
    }
}

/**
 * Implementation of Basic authentication strategy from JSON data
 */
@Injectable()
export class BasicJSONStrategy extends PassportStrategy(Strategy) {
    auth: Authenticator;

    /**
     * Creates a new `BasicJSONStrategy` and sets the authentication method that is used.
     * @param authService AuthService to validate the Admin
     */
    constructor(private authService: AuthService) {
        super();
        this.auth = pwd_auth;
    }

    /**
     * Validates an Admin user with username and password
     * @param username Username from JSON
     * @param password Password from JSON
     */
    async validate(username: string, password: string): Promise<any> {
        return await this.auth(username, password, this.authService);
    }
}

