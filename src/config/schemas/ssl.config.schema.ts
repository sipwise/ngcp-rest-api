import {IsString} from 'class-validator'

export class SSLConfig {
    @IsString()
        ssl_cert_file: string

    @IsString()
        ssl_cert_key_file: string
}