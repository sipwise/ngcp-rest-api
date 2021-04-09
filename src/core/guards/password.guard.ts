import {Injectable} from '@nestjs/common';
import {AuthGuard} from "@nestjs/passport";

@Injectable()
export class PasswordGuard extends AuthGuard(['basic', 'local']) {}