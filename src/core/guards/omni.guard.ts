import {Injectable} from "@nestjs/common";
import {AuthGuard} from "@nestjs/passport";

@Injectable()
export class OmniGuard extends AuthGuard(['jwt', 'cert-header', 'basic', 'local']) {}