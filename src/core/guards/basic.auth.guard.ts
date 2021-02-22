import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { compareSync } from 'bcrypt';
import { AdminsService } from 'src/modules/admins/admins.service';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(
    private readonly adminsService: AdminsService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log(request.socket)
    const b64auth = (request.headers.authorization || '').split(' ')[1] || '';
    const [username, password] = Buffer.from(b64auth, 'base64')
      .toString()
      .split(':');

    const admin = await this.adminsService.findOneByLogin(username);
    if (!admin) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const [b64salt, b64hash] = admin.saltedpass.split('$');
    const bcrypt_version = '2b';
    const bcrypt_cost = 13;

    if (admin && compareSync(password, `$${bcrypt_version}$${bcrypt_cost}$${b64salt}${b64hash}`) !== false) {
      request.user = admin;
      return true;
    }
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }
}