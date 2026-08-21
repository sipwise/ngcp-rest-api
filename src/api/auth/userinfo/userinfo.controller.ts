import {Controller, Get, Req} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {Auth} from '~/decorators/auth.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Auth()
@ApiTags('Userinfo')
@Controller()
export class AuthUserinfoController {
    @Get('auth/userinfo')
    async userinfo(@Req() req: Request): Promise<unknown> {
        const sr = new ServiceRequest(req)
        return sr.user
    }
}
