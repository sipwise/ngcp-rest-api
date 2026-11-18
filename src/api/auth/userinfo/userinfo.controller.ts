import {Controller, Get, Req} from '@nestjs/common'
import {ApiOkResponse, ApiTags} from '@nestjs/swagger'
import {Request} from 'express'

import {UserinfoResponseDto} from './dto/userinfo-response.dto'

import {Auth} from '~/decorators/auth.decorator'
import {NoExpand} from '~/decorators/expand.decorator'
import {ServiceRequest} from '~/interfaces/service-request.interface'

@Auth()
@ApiTags('Userinfo')
@NoExpand()
@Controller()
export class AuthUserinfoController {
    @Get('auth/userinfo')
    @ApiOkResponse({type: UserinfoResponseDto})
    userinfo(@Req() req: Request): UserinfoResponseDto {
        const sr = new ServiceRequest(req)
        return new UserinfoResponseDto(sr.user)
    }
}
