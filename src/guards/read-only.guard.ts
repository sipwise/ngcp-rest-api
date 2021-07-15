import {CanActivate, ExecutionContext, Injectable} from "@nestjs/common";

@Injectable()
export class ReadOnlyGuard implements CanActivate {

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        if (!request.user.readOnly) {
            return true
        }
        return request.method.toLowerCase() === "get"
    }
}
