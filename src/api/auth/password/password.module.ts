import {Module} from '@nestjs/common'

import {AuthPasswordController} from './password.controller'

@Module({
    controllers: [AuthPasswordController],
})
export class AuthPasswordModule {
}
