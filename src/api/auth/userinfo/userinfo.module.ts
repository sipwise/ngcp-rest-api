import {Module} from '@nestjs/common'

import {AuthUserinfoController} from './userinfo.controller'

@Module({
    controllers: [AuthUserinfoController],
})
export class AuthUserinfoModule {
}
