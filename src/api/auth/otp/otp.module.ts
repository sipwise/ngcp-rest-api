import {Module} from '@nestjs/common'

import {AuthOtpController} from './otp.controller'

@Module({
    controllers: [AuthOtpController],
})
export class AuthOtpModule {
}
