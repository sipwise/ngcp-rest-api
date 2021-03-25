import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {compare} from 'bcrypt';
import {AdminsService} from 'modules/admins/admins.service';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(
    protected readonly adminsService: AdminsService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const b64auth = (request.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = Buffer.from(b64auth, 'base64')
      .toString()
      .split(':');

    const admin = await this.adminsService.findOneByLogin(username);
    if (!admin) {
        return false;
    }

    const [b64salt, b64hash] = admin.saltedpass.split('$');
    const bcrypt_version = '2b';
    const bcrypt_cost = 13;

    if (admin && await compare(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`) !== false) {
      request.user = admin;
      return true;
    }
    return false;
  }
}