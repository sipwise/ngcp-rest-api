import {Injectable} from '@nestjs/common'
import {AuthGuard} from '@nestjs/passport'

@Injectable()
/**
 * Authentication guard uses certificate authentication strategy
 */
export class CertGuard extends AuthGuard('cert-header') {
}
