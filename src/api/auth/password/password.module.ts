import {Module} from '@nestjs/common'

import {PasswordController} from './password.controller'

@Module({
    controllers: [PasswordController],
})
export class PasswordModule {
}
