import {IsNumber, IsOptional, ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'
import {DatabaseConfig} from '~/config/schemas/database.config.schema'
import {RedisConfig} from '~/config/schemas/redis.config.schema'
import {CommonConfig} from '~/config/schemas/common.config.schema'
import {FileShareConfig} from '~/config/schemas/fileshare.config.schema'
import {SecurityConfig} from '~/config/schemas/security.config.schema'
import {SSLConfig} from '~/config/schemas/ssl.config.schema'
import {LegacyConfig} from '~/config/schemas/legacy.config.schema'

export class AppConfig {
    @ValidateNested()
    @Type(() => DatabaseConfig)
        database: DatabaseConfig

    @ValidateNested()
    @Type(() => RedisConfig)
        redis: RedisConfig

    @ValidateNested()
    @Type(() => CommonConfig)
        common: CommonConfig

    @ValidateNested()
    @Type(() => FileShareConfig)
        fileshare: FileShareConfig

    @ValidateNested()
    @Type(() => SSLConfig)
        ssl: SSLConfig

    @ValidateNested()
    @Type(() => LegacyConfig)
        legacy: LegacyConfig

    @ValidateNested()
    @Type(() => SecurityConfig)
        security: SecurityConfig

    @IsNumber()
    @IsOptional()
        post_return_max_link?: number
}
