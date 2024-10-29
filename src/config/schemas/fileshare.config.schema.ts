// Import required decorators
import {Transform,Type} from 'class-transformer'
import {IsNumber, IsString, ValidateNested} from 'class-validator'

class FileShareLimits {
    @IsNumber()
        quota: number

    @IsNumber()
        upload_size: number

    @IsNumber()
        user_files: number

    @IsNumber()
        user_quota: number
}

export class FileShareConfig {
    @IsString()
        enable: string

    @IsNumber()
        ttl: number

    // Transform 'yes'/'no' strings to boolean values
    @Transform(({value}) => value === 'yes', {toClassOnly: true})
        public_links: boolean

    @ValidateNested()
    @Type(() => FileShareLimits)
        limits: FileShareLimits
}
