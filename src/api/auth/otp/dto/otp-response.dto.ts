import {IsString} from 'class-validator'

import {CanBeNull} from '~/decorators/can-be-null.decorator'
import {ResponseDto} from '~/dto/response.dto'

export class OtpResponseDto extends ResponseDto {
    @CanBeNull()
    @IsString()
        otp_secret_key: string
}