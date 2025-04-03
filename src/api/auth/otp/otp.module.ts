import {Module} from '@nestjs/common'

import {OtpController} from './otp.controller'

@Module({
    controllers: [OtpController],
})
export class OtpModule {
}