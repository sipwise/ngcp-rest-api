import {UnauthorizedException} from '@nestjs/common'

import {CrudController} from '~/controllers/crud.controller'
import {RequestDto} from '~/dto/request.dto'
import {ResponseDto} from '~/dto/response.dto'

/**
 * `hasPermissionToAccessController` returns whether the provided `role` has access to a controller, or it's `read` method.
 *
 * The method metadata has precedence over the class metadata.
 *
 * It first reads the `rbacroles` metadataKey of the `controller.read` method and checks if the `role` is included. If that
 * is not the case the same thing is repeated for the `controller.constructor` metadata.
 *
 * @param role user role
 * @param controller controller that extends CrudController
 */
async function hasPermissionToAccessController(role: string, controller: CrudController<RequestDto,ResponseDto>): Promise<boolean> {
    const methodMetadata: string[] = Reflect.getMetadata('rbacroles', controller.read)
    if (methodMetadata != undefined) {
        return methodMetadata.includes(role)
    }
    const classMetadata: string[] = Reflect.getMetadata('rbacroles', controller.constructor)
    if (classMetadata != undefined) {
        return classMetadata.includes(role)
    }
    return false
}

/**
 * Calls `read()` method of provided `controller` and verifies user authorization.
 * Also adds a boolean property 'isInternalRedirect' to the request so that the provided 'controller'
 * can know that this request has been redirected by another controller. This will prevent
 * the expand process from being triggered again.
 *
 * @param controller controller that extends CrudController
 * @param id identifier of object to read
 * @param req request object containing user
 * @throws UnauthorizedException
 * @constructor
 */
// TODO: req can be any because user can be attached to request, maybe fixable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ProtectedReadCall(controller: CrudController<RequestDto,ResponseDto>, id: number, req: any): Promise<any> {
    const role = req.user.role
    if (!await hasPermissionToAccessController(role, controller)) {
        throw new UnauthorizedException()
    }
    req.isInternalRedirect = true
    return await controller.read(id, req)
}

