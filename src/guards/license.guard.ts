import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common'
import {Reflector} from '@nestjs/core'

import {PublicGuard} from './public.guard'

import {LicenseService} from '~/license/license.service'

@Injectable()
export class LicenseGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly licenseService: LicenseService,
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = new PublicGuard(this.reflector)
        if (await isPublic.canActivate(context))
            return true

        const controllerLicenses = this.reflector.get<string[]>('licenses', context.getClass())
        const handlerLicenses = this.reflector.get<string[]>('licenses', context.getHandler())

        // if both are set, then the handler's licenses take precedence
        const licenses = handlerLicenses ?? controllerLicenses

        if (licenses.length === 0)
            return true

        return await this.licenseService.areLicensesActive(licenses)
    }
}
