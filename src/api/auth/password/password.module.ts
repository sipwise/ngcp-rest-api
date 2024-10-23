import {Module} from '@nestjs/common'
import {PasswordController} from '~/api/auth/password/password.controller'

@Module({
    controllers: [PasswordController],
})
export class PasswordModule {
}
