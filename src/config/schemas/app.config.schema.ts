import {IsNumber, IsOptional, ValidateNested} from 'class-validator'
import {Type} from 'class-transformer'
import {DatabaseConfig} from './database.config.schema'
import {RedisConfig} from './redis.config.schema'
import {CommonConfig} from './common.config.schema'
import {FileShareConfig} from './fileshare.config.schema'
import {SecurityConfig} from './security.config.schema'
import {SSLConfig} from './ssl.config.schema'
import {LegacyConfig} from './legacy.config.schema'

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
