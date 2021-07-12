import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'
import {AdminsService} from '../api/admins/admins.service'

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector, private readonly adminsService: AdminsService) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const roles = this.reflector.get<string[]>('roles', context.getHandler())
        if (!roles) {
            return true
        }
        const request = context.switchToHttp().getRequest()
        const b64auth = (request.headers.authorization || '').split(' ')[1] || ''
        const [username, password] = Buffer.from(b64auth, 'base64')
            .toString()
            .split(':')

        if (!username) {
            return false
        }

        const admin = await this.adminsService.readOneByLogin(username)
        if (!admin) {
            return false
        }
        return admin.is_superuser
    }
}
